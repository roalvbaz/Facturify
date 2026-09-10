/**
 * Tests del gestor de la cola Veri*factu (queue/manager.ts).
 *
 * Verifican el CRUD sobre verifactu_submissions y, sobre todo, el
 * backoff exponencial de scheduleRetry (1min → 5min → 15min → 1h → 4h).
 *
 * La base de datos se simula con un mock de `@/db` que captura los .set()
 * para poder inspeccionar los valores escritos (nesting of drizzle chain).
 */

import { it, expect, describe, vi, beforeEach } from 'vitest';

// Capturadores de los valores que el manager escribe en la BD
const updates = vi.hoisted(() => [] as any[]);
const inserts = vi.hoisted(() => [] as any[]);

vi.mock('@/db', () => ({
  db: {
    insert: (table: any) => ({
      values: (v: any) => ({
        returning: async () => {
          inserts.push(v);
          return [{ id: 'sub-00000000-0000-0000-0000-000000000001' }];
        },
      }),
    }),
    update: (table: any) => ({
      set: (s: any) => ({
        where: async () => {
          updates.push(s);
        },
      }),
    }),
    execute: async () => [],
  },
}));

vi.mock('@/db/schema', () => ({
  verifactu_submissions: {},
  companies: {},
  invoices: {},
  customers: {},
  audit_logs: {},
  company_settings: {},
  invoice_lines: {},
}));

import {
  addToQueue,
  markAsConforme,
  markAsError,
  scheduleRetry,
} from '../queue/manager';

describe('queue/manager', () => {
  beforeEach(() => {
    updates.length = 0;
    inserts.length = 0;
  });

  it('addToQueue encola un envío ALTA con estado PENDIENTE', async () => {
    const row = await addToQueue({
      companyId: 'comp-1',
      invoiceId: 'inv-1',
      operationType: 'ALTA',
      xmlBody: '<registro/>',
    });

    expect(row?.id).toContain('sub-');
    expect(inserts[0].operation_type).toBe('ALTA');
    expect(inserts[0].status).toBe('PENDIENTE');
    expect(inserts[0].attempts).toBe(0);
    expect(inserts[0].max_attempts).toBe(5);
  });

  it('addToQueue respeta maxAttempts personalizado', async () => {
    await addToQueue({
      companyId: 'c',
      invoiceId: 'i',
      operationType: 'ANULACION',
      xmlBody: '<r/>',
      maxAttempts: 3,
    });
    expect(inserts[0].max_attempts).toBe(3);
  });

  it('markAsConforme escribe CONFORME + CSV', async () => {
    await markAsConforme('sub-1', 'CSV-TEST-123', '<respuesta/>');
    expect(updates[0].status).toBe('CONFORME');
    expect(updates[0].csv).toBe('CSV-TEST-123');
  });

  it('markAsError escribe ERROR + last_error', async () => {
    await markAsError('sub-1', 'Se acabaron los reintentos');
    expect(updates[0].status).toBe('ERROR');
    expect(updates[0].last_error).toBe('Se acabaron los reintentos');
  });

  it('scheduleRetry aplica backoff de 1 minuto en el primer intento', async () => {
    const fechaAntes = Date.now();
    await scheduleRetry('sub-1', 0, 'Timeout de red');
    const { status, attempts, next_retry_at, last_error } = updates[0];
    expect(status).toBe('PENDIENTE');
    expect(attempts).toBe(1);
    expect(last_error).toBe('Timeout de red');
    const delayMs = next_retry_at.getTime() - fechaAntes;
    // 1 minuto (±2s de tolerancia por tiempo de ejecución)
    expect(Math.abs(delayMs - 60_000)).toBeLessThan(5_000);
  });

  it('scheduleRetry escala a 5 minutos en el segundo intento', async () => {
    const antes = Date.now();
    await scheduleRetry('sub-1', 1, 'Error');
    expect(updates[0].attempts).toBe(2);
    const delayMs = updates[0].next_retry_at.getTime() - antes;
    expect(Math.abs(delayMs - 300_000)).toBeLessThan(5_000);
  });

  it('scheduleRetry no sobrepasa 4 horas (última fase del backoff)', async () => {
    const antes = Date.now();
    // Intentos 4, 5, 6... todos deben caer en la última fase (240 min)
    await scheduleRetry('sub-1', 4, 'Error');
    const delay4 = updates[0].next_retry_at.getTime() - antes;
    expect(Math.abs(delay4 - 240 * 60_000)).toBeLessThan(5_000);

    await scheduleRetry('sub-1', 99, 'Error');
    const delay99 = updates[1].next_retry_at.getTime() - Date.now();
    expect(delay99).toBeLessThanOrEqual(240 * 60_000 + 5_000);
  });
});