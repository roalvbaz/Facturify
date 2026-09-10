/**
 * Gestor de la cola de envíos Veri*factu.
 *
 * Encapsula las operaciones CRUD sobre la tabla `verifactu_submissions`:
 *  - addToQueue: encolar un envío nuevo
 *  - getSubmissionById: consultar el estado de un envío concreto
 *  - markAsSending: marcar como ENVIADO (evita duplicados en procesamiento)
 *  - markAsConforme: registrar éxito + CSV
 *  - markAsError: registrar fallo definitivo
 *  - scheduleRetry: programar reintento con backoff exponencial
 *  - getPendingSubmissions: obtener items listos para enviar
 */

import { db } from '@/db';
import { verifactu_submissions } from '@/db/schema';
import { eq, and, lte, asc, sql } from 'drizzle-orm';

export type SubmissionStatus =
  | 'PENDIENTE'
  | 'ENVIADO'
  | 'CONFORME'
  | 'NO_CONFORME'
  | 'ERROR';

/**
 * Backoff exponencial en minutos: 1, 5, 15, 60, 240 (4h).
 * El índice del array = intento 0-based. Si supera la lista, se usa el último.
 */
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

function nextRetryDelay(attempt: number): number {
  return BACKOFF_MINUTES[Math.min(attempt, BACKOFF_MINUTES.length - 1)];
}

// ──────────────────────────────────────────────
//  addToQueue
// ──────────────────────────────────────────────

export interface AddToQueueParams {
  companyId: string;
  invoiceId: string;
  operationType: 'ALTA' | 'ANULACION';
  xmlBody: string;
  /** Máximo de reintentos (default 5) */
  maxAttempts?: number;
}

export async function addToQueue(params: AddToQueueParams) {
  const now = new Date();
  const [row] = await db
    .insert(verifactu_submissions)
    .values({
      company_id: params.companyId,
      invoice_id: params.invoiceId,
      operation_type: params.operationType,
      xml_body: params.xmlBody,
      status: 'PENDIENTE',
      attempts: 0,
      max_attempts: params.maxAttempts ?? 5,
      next_retry_at: now, // listo para procesar de inmediato
      created_at: now,
      updated_at: now,
    })
    .returning({ id: verifactu_submissions.id });

  return row;
}

// ──────────────────────────────────────────────
//  getSubmissionById
// ──────────────────────────────────────────────

export async function getSubmissionById(submissionId: string) {
  const [row] = await db
    .select()
    .from(verifactu_submissions)
    .where(eq(verifactu_submissions.id, submissionId))
    .limit(1);
  return row ?? null;
}

/** Busca el envío más reciente de una factura (por invoice_id) */
export async function getSubmissionByInvoiceId(invoiceId: string) {
  const [row] = await db
    .select()
    .from(verifactu_submissions)
    .where(eq(verifactu_submissions.invoice_id, invoiceId))
    .orderBy(sql`${verifactu_submissions.created_at} DESC`)
    .limit(1);
  return row ?? null;
}

// ──────────────────────────────────────────────
//  markAsSending (evita duplicados encolando)
// ──────────────────────────────────────────────

export async function markAsSending(submissionId: string) {
  await db
    .update(verifactu_submissions)
    .set({
      status: 'ENVIADO',
      updated_at: new Date(),
    })
    .where(
      and(
        eq(verifactu_submissions.id, submissionId),
        eq(verifactu_submissions.status, 'PENDIENTE')
      )
    );
}

// ──────────────────────────────────────────────
//  markAsConforme
// ──────────────────────────────────────────────

export async function markAsConforme(
  submissionId: string,
  csv: string,
  aeatResponse?: unknown
) {
  await db
    .update(verifactu_submissions)
    .set({
      status: 'CONFORME',
      csv,
      aeat_response: aeatResponse as any,
      updated_at: new Date(),
    })
    .where(eq(verifactu_submissions.id, submissionId));
}

// ──────────────────────────────────────────────
//  markAsError (fallo permanente — sin más reintentos)
// ──────────────────────────────────────────────

export async function markAsError(
  submissionId: string,
  error: string,
  aeatResponse?: unknown
) {
  await db
    .update(verifactu_submissions)
    .set({
      status: 'ERROR',
      last_error: error,
      aeat_response: aeatResponse as any,
      updated_at: new Date(),
    })
    .where(eq(verifactu_submissions.id, submissionId));
}

// ──────────────────────────────────────────────
//  scheduleRetry (backoff exponencial)
// ──────────────────────────────────────────────

export async function scheduleRetry(
  submissionId: string,
  currentAttempts: number,
  error: string,
  aeatResponse?: unknown
) {
  const delay = nextRetryDelay(currentAttempts);
  const nextRetryAt = new Date(Date.now() + delay * 60_000);

  await db
    .update(verifactu_submissions)
    .set({
      status: 'PENDIENTE',
      attempts: currentAttempts + 1,
      next_retry_at: nextRetryAt,
      last_error: error,
      aeat_response: aeatResponse as any,
      updated_at: new Date(),
    })
    .where(eq(verifactu_submissions.id, submissionId));
}

// ──────────────────────────────────────────────
//  getPendingSubmissions (listos para procesar)
// ──────────────────────────────────────────────

export interface PendingSubmission {
  id: string;
  company_id: string;
  invoice_id: string;
  operation_type: string;
  xml_body: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: Date | null;
  last_error: string | null;
}

/**
 * Devuelve los envíos pendientes o con reintento programado cuyo
 * `next_retry_at` ya ha pasado, ordenados por antigüedad.
 *
 * NOTA: usamos sql`` crudo porque drizzle-orm rc4 no soporta perfectamente
 * el <= sobre columnas con `where`, así que filtramos en el query raw y
 * mapeamos el resultado.
 */
export async function getPendingSubmissions(limit = 10): Promise<PendingSubmission[]> {
  const rows = await db.execute(sql`
    SELECT
      id::text as id,
      company_id::text as company_id,
      invoice_id::text as invoice_id,
      operation_type,
      xml_body,
      status,
      attempts,
      max_attempts,
      next_retry_at,
      last_error
    FROM verifactu_submissions
    WHERE status IN ('PENDIENTE', 'ENVIADO')
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT ${limit}
  `);

  return (rows as any[]).map((r) => ({
    id: r.id as string,
    company_id: r.company_id as string,
    invoice_id: r.invoice_id as string,
    operation_type: r.operation_type as string,
    xml_body: r.xml_body as string,
    status: r.status as string,
    attempts: Number(r.attempts) || 0,
    max_attempts: Number(r.max_attempts) || 5,
    next_retry_at: r.next_retry_at ? new Date(r.next_retry_at) : null,
    last_error: r.last_error as string | null,
  }));
}
