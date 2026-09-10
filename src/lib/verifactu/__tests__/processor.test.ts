/**
 * Tests del procesador de la cola (queue/processor.ts).
 *
 * Simula: manager (funciones de persistencia), cliente SOAP y certificado.
 * Verifica el árbol de decisión:
 *  - éxito → CONFORME con CSV
 *  - error reintentable → scheduleRetry (backoff)
 *  - error no reintentable / agotados → ERROR
 *  - empresa sin certificado → ERROR específico
 */

import { it, expect, describe, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
const {
  getPendingSubmissions,
  markAsSending,
  markAsConforme,
  markAsError,
  scheduleRetry,
  submitToVerifactu,
  isRetryableError,
  getCompanyCertificateDecrypted,
} = vi.hoisted(() => ({
  getPendingSubmissions: vi.fn(),
  markAsSending: vi.fn(),
  markAsConforme: vi.fn(),
  markAsError: vi.fn(),
  scheduleRetry: vi.fn(),
  submitToVerifactu: vi.fn(),
  isRetryableError: vi.fn(),
  getCompanyCertificateDecrypted: vi.fn(),
}));

vi.mock('../queue/manager', () => ({
  getPendingSubmissions,
  markAsSending,
  markAsConforme,
  markAsError,
  scheduleRetry,
}));

vi.mock('../soap/client', () => ({ submitToVerifactu, isRetryableError }));

vi.mock('@/actions/company.actions', () => ({ getCompanyCertificateDecrypted }));

import { processQueue } from '../queue/processor';

const ITEM = {
  id: 'sub-1',
  company_id: 'comp-1',
  invoice_id: 'inv-1',
  operation_type: 'ALTA',
  xml_body: '<SuministroLRFacturasEmitidas/>',
  status: 'PENDIENTE',
  attempts: 0,
  max_attempts: 5,
  next_retry_at: null,
  last_error: null,
};

describe('queue/processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCompanyCertificateDecrypted.mockResolvedValue({
      pfxBase64: 'base64pfx',
      password: 'pw',
      environment: 'sandbox',
    });
  });

  it('registra CONFORME + CSV cuando la AEAT acepta', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM]);
    submitToVerifactu.mockResolvedValue({
      success: true,
      csv: 'CSV-OK-123',
      rawResponseXml: '<respuesta/>',
    });

    const result = await processQueue(10);

    expect(result).toEqual({ processed: 1, successes: 1, retries: 0, errors: 0 });
    expect(markAsSending).toHaveBeenCalledWith('sub-1');
    expect(submitToVerifactu).toHaveBeenCalledWith({
      xmlBody: ITEM.xml_body,
      pfxBase64: 'base64pfx',
      pfxPassword: 'pw',
      environment: 'sandbox',
    });
    expect(markAsConforme).toHaveBeenCalledWith('sub-1', 'CSV-OK-123', '<respuesta/>');
  });

  it('reintenta con backoff si el error es reintentable', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM]);
    submitToVerifactu.mockResolvedValue({
      success: false,
      error: 'fetch failed: AEAT caída',
      rawResponseXml: '',
    });
    isRetryableError.mockReturnValue(true);

    const result = await processQueue(10);

    expect(result).toEqual({ processed: 1, successes: 0, retries: 1, errors: 0 });
    expect(scheduleRetry).toHaveBeenCalledWith('sub-1', 0, 'fetch failed: AEAT caída', '');
    expect(markAsError).not.toHaveBeenCalled();
  });

  it('marca ERROR cuando se agotan los reintentos', async () => {
    getPendingSubmissions.mockResolvedValue([{ ...ITEM, attempts: 5 }]);
    submitToVerifactu.mockResolvedValue({ success: false, error: 'socket hang up' });
    isRetryableError.mockReturnValue(true);

    const result = await processQueue(10);

    expect(result.errors).toBe(1);
    // attempts(5) >= max(5) → el mensaje indica reintentos agotados
    expect(markAsError).toHaveBeenCalledWith(
      'sub-1',
      expect.stringContaining('Agotados los 5 reintentos'),
      undefined
    );
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('marca ERROR si el error NO es reintentable (config)', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM]);
    submitToVerifactu.mockResolvedValue({
      success: false,
      error: 'Certificado inválido: no se pudo leer',
    });
    isRetryableError.mockReturnValue(false);

    const result = await processQueue(10);

    expect(result.errors).toBe(1);
    expect(markAsError).toHaveBeenCalledWith(
      'sub-1',
      'Certificado inválido: no se pudo leer',
      undefined
    );
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('marca ERROR si la empresa no tiene certificado', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM]);
    getCompanyCertificateDecrypted.mockResolvedValue(null);

    const result = await processQueue(10);

    expect(result.errors).toBe(1);
    expect(markAsError).toHaveBeenCalledWith(
      'sub-1',
      expect.stringContaining('no tiene certificado digital')
    );
    expect(submitToVerifactu).not.toHaveBeenCalled();
  });

  it('captura excepciones inesperadas durante el envío (catch del procesador)', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM]);
    getCompanyCertificateDecrypted.mockRejectedValue(new Error('fallo de descifrado'));

    const result = await processQueue(10);

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(1);
    expect(markAsError).toHaveBeenCalledWith('sub-1', 'Error del procesador: fallo de descifrado');
    expect(submitToVerifactu).not.toHaveBeenCalled();
  });

  it('procesa varios envíos en una sola pasada', async () => {
    getPendingSubmissions.mockResolvedValue([ITEM, { ...ITEM, id: 'sub-2' }]);
    submitToVerifactu.mockResolvedValue({ success: true, csv: 'CSV-1' });

    const result = await processQueue(10);
    expect(result.processed).toBe(2);
    expect(result.successes).toBe(2);
    expect(markAsConforme).toHaveBeenCalledTimes(2);
  });

  it('procesa NONE cuando no hay pendientes', async () => {
    getPendingSubmissions.mockResolvedValue([]);
    const result = await processQueue(10);
    expect(result).toEqual({ processed: 0, successes: 0, retries: 0, errors: 0 });
  });
});