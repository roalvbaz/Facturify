'use server';

import { db } from '@/db';
import { audit_logs, company_members } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';

// ============================================================
// Server Actions — Auditoría (solo admins/owners)
// ============================================================

interface AuditLogFilters {
  eventCode?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: { timestamp: Date; id: string };
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  company_id: string | null;
  user_id: string | null;
  event_code: string;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: Date;
}

interface AuditLogsResult {
  logs: AuditLogEntry[];
  nextCursor: { timestamp: Date; id: string } | null;
  totalCount: number;
}

/**
 * Verifica que el usuario actual tenga rol OWNER o ADMIN en la empresa activa.
 * Si no, redirige al dashboard.
 */
async function requireAdminRole(): Promise<{ userId: string; companyId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const companyId = cookieStore.get('active_company_id')?.value;

  if (!companyId) redirect('/empresas');

  // Verificar rol
  const [membership] = await db
    .select()
    .from(company_members)
    .where(
      and(
        eq(company_members.user_id, user.id),
        eq(company_members.company_id, companyId)
      )
    )
    .limit(1);

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    redirect('/dashboard');
  }

  return { userId: user.id, companyId };
}

/**
 * Obtiene los logs de auditoría de la empresa activa con filtros y paginación.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResult> {
  const { companyId } = await requireAdminRole();

  const limit = filters.limit ?? 50;
  const conditions = [eq(audit_logs.company_id, companyId)];

  if (filters.eventCode) {
    conditions.push(eq(audit_logs.event_code, filters.eventCode));
  }
  if (filters.userId) {
    conditions.push(eq(audit_logs.user_id, filters.userId));
  }
  if (filters.dateFrom) {
    conditions.push(gte(audit_logs.timestamp, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(audit_logs.timestamp, new Date(filters.dateTo)));
  }
  if (filters.cursor) {
    // Paginación por cursor: timestamp DESC, id DESC
    conditions.push(
      sql`(${audit_logs.timestamp}, ${audit_logs.id}) < (${filters.cursor.timestamp}, ${filters.cursor.id})`
    );
  }

  const whereClause = and(...conditions);

  const logs = await db
    .select()
    .from(audit_logs)
    .where(whereClause)
    .orderBy(desc(audit_logs.timestamp), desc(audit_logs.id))
    .limit(limit + 1); // +1 para detectar si hay más

  const hasMore = logs.length > limit;
  const resultLogs = hasMore ? logs.slice(0, limit) : logs;

  // Total count (sin paginación)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(audit_logs)
    .where(and(eq(audit_logs.company_id, companyId)));

  const nextCursor =
    hasMore && resultLogs.length > 0
      ? {
          timestamp: resultLogs[resultLogs.length - 1].timestamp,
          id: resultLogs[resultLogs.length - 1].id,
        }
      : null;

  return {
    logs: resultLogs.map((log) => ({
      ...log,
      metadata: log.metadata as Record<string, unknown> | null,
    })),
    nextCursor,
    totalCount: countResult?.count ?? 0,
  };
}

/**
 * Obtiene la lista de códigos de evento disponibles para los filtros.
 */
export async function getAuditEventCodes(): Promise<string[]> {
  const { companyId } = await requireAdminRole();

  const result = await db
    .selectDistinct({ event_code: audit_logs.event_code })
    .from(audit_logs)
    .where(eq(audit_logs.company_id, companyId))
    .orderBy(audit_logs.event_code);

  return result.map((r) => r.event_code);
}
