// ============================================================
// Rate limiting con base de datos — src/lib/rateLimit.ts
// ============================================================
// Usa la tabla `security_counters` (clave, acción, ventana) con un
// upsert atómico. Cada ventana se alinea al momento de la petición
// (bucket) y al escribir se eliminan las filas viejas de la misma
// (clave, acción) para que la tabla no crezca sin límite.
//
// El rate limit NUNCA debe romper la operación: si la tabla falla,
// devolvemos { allowed: true } (fail-open) y solo logueamos el error.
// ============================================================

import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { security_counters } from '@/db/schema';

interface RateLimitParams {
  /** Clave de agrupación: p.ej. email normalizado o IP. */
  key: string;
  /** Nombre de la acción: p.ej. 'LOGIN_FAILED'. */
  action: string;
  /** Nº de ocurrencias permitidas por ventana. */
  max: number;
  /** Duración de la ventana en segundos. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos restantes hasta que se abra una ventana nueva (si bloqueado). */
  retryAfterSeconds?: number;
}

export async function checkRateLimit({
  key,
  action,
  max,
  windowSeconds,
}: RateLimitParams): Promise<RateLimitResult> {
  try {
    const windowMs = windowSeconds * 1000;
    const now = Date.now();
    // Ventana alineada: bucket = floor(now / ventana) * ventana
    const bucketMs = Math.floor(now / windowMs) * windowMs;
    const bucketStart = new Date(bucketMs);

    // Limpieza de buckets antiguos de esta (clave, acción).
    await db
      .delete(security_counters)
      .where(
        and(
          eq(security_counters.key, key),
          eq(security_counters.action, action),
          lt(security_counters.window_start, bucketStart)
        )
      );

    // Upsert atómico del contador en la ventana actual.
    await db
      .insert(security_counters)
      .values({ key, action, window_start: bucketStart, count: 1 })
      .onConflictDoUpdate({
        target: [
          security_counters.key,
          security_counters.action,
          security_counters.window_start,
        ],
        set: { count: sql`${security_counters.count} + 1` },
      });

    const [row] = await db
      .select({ count: security_counters.count })
      .from(security_counters)
      .where(
        and(
          eq(security_counters.key, key),
          eq(security_counters.action, action),
          eq(security_counters.window_start, bucketStart)
        )
      )
      .limit(1);

    const count = row?.count ?? 1;

    if (count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucketMs + windowMs - now) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true };
  } catch (error) {
    console.error('💥 Rate limit falló (fail-open):', error);
    return { allowed: true };
  }
}

/**
 * Lectura del contador SIN incrementarlo. Útil para decidir antes de
 * ejecutar una acción si ya se superó el límite (sin contarla como un
 * intento más).
 */
export async function peekRateLimit({
  key,
  action,
  max,
  windowSeconds,
}: RateLimitParams): Promise<RateLimitResult> {
  try {
    const windowMs = windowSeconds * 1000;
    const now = Date.now();
    const bucketMs = Math.floor(now / windowMs) * windowMs;
    const bucketStart = new Date(bucketMs);

    const [row] = await db
      .select({ count: security_counters.count })
      .from(security_counters)
      .where(
        and(
          eq(security_counters.key, key),
          eq(security_counters.action, action),
          eq(security_counters.window_start, bucketStart)
        )
      )
      .limit(1);

    const count = row?.count ?? 0;

    if (count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucketMs + windowMs - now) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true };
  } catch (error) {
    console.error('💥 peekRateLimit falló (fail-open):', error);
    return { allowed: true };
  }
}