/**
 * Procesador de la cola de envíos Veri*factu.
 *
 * Se ejecuta periódicamente desde el cron job (`/api/cron/verifactu`).
 * Para cada envío pendiente con `next_retry_at` en el pasado (o null):
 *  1. Bloquea el registro (marca ENVIADO para evitar duplicados)
 *  2. Descifra el PFX de la empresa
 *  3. Envía el XML a la AEAT
 *  4. Procesa la respuesta → CONFORME, NO_CONFORME, reintento o ERROR
 */

import {
  getPendingSubmissions,
  markAsSending,
  markAsConforme,
  markAsError,
  scheduleRetry,
} from './manager';
import { submitToVerifactu, isRetryableError } from '../soap/client';
import { getCompanyCertificateDecrypted } from '@/actions/company.actions';

export interface ProcessResult {
  processed: number;
  successes: number;
  retries: number;
  errors: number;
}

/**
 * Procesa todos los envíos pendientes de la cola.
 * Retorna un resumen de lo procesado.
 */
export async function processQueue(limit = 20): Promise<ProcessResult> {
  const pending = await getPendingSubmissions(limit);
  const result: ProcessResult = { processed: 0, successes: 0, retries: 0, errors: 0 };

  for (const item of pending) {
    result.processed++;

    // 1. Bloquear el registro para evitar duplicados
    await markAsSending(item.id);

    try {
      // 2. Descifrar el certificado de la empresa
      const cert = await getCompanyCertificateDecrypted(item.company_id);
      if (!cert) {
        await markAsError(
          item.id,
          'La empresa no tiene certificado digital configurado. Sube un PFX en Configuración.'
        );
        result.errors++;
        continue;
      }

      // 3. Enviar a la AEAT
      const response = await submitToVerifactu({
        xmlBody: item.xml_body,
        pfxBase64: cert.pfxBase64,
        pfxPassword: cert.password,
        environment: cert.environment,
      });

      // 4. Procesar la respuesta
      if (response.success) {
        const csv = response.csv || `CSV-${Date.now()}`;
        await markAsConforme(item.id, csv, response.rawResponseXml);
        result.successes++;
      } else if (isRetryableError(response) && item.attempts < item.max_attempts) {
        // Error reintentable → backoff exponencial
        await scheduleRetry(
          item.id,
          item.attempts,
          response.error || 'Error desconocido',
          response.rawResponseXml
        );
        result.retries++;
      } else {
        // Error permanente o agotados los reintentos
        const errorMsg =
          item.attempts >= item.max_attempts
            ? `Agotados los ${item.max_attempts} reintentos. Último error: ${response.error}`
            : response.error || 'Error no reintentable';
        await markAsError(item.id, errorMsg, response.rawResponseXml);
        result.errors++;
      }
    } catch (err: any) {
      // Error inesperado del procesador
      await markAsError(item.id, `Error del procesador: ${err?.message || err}`);
      result.errors++;
    }
  }

  return result;
}
