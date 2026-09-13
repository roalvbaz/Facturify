/**
 * Descarga / adjunto del PDF de presupuesto — versión CLIENTE.
 *
 * El PDF se genera EN EL SERVIDOR con @react-pdf/renderer (ver
 * `src/lib/pdf/invoicePdf.tsx`) a través de la server action
 * `getEstimatePdfBase64Action`. Aquí solo recibimos el base64 y lo entregamos
 * como descarga o como data string para el email.
 */

import { getEstimatePdfBase64Action } from '@/actions/estimate.actions';

/** Descarga el PDF de un presupuesto guardado. */
export async function descargarPresupuestoPDF(
  estimateId: string,
  numeroPresupuesto: string
): Promise<void> {
  if (!estimateId) throw new Error('No se encontró el presupuesto para generar el PDF.');

  const res = await getEstimatePdfBase64Action(estimateId);
  if (!res?.success || !res.pdfBase64) {
    throw new Error(res?.error || 'Error al generar el PDF.');
  }

  downloadBase64Pdf(res.pdfBase64, `Presupuesto_${numeroPresupuesto || 'Documento'}.pdf`);
}

/** Genera el PDF (base64) de un presupuesto guardado, para adjuntarlo. */
export async function generarPresupuestoBase64PDF(estimateId: string): Promise<string> {
  if (!estimateId) throw new Error('No se encontró el presupuesto para generar el PDF.');

  const res = await getEstimatePdfBase64Action(estimateId);
  if (!res?.success || !res.pdfBase64) {
    throw new Error(res?.error || 'Error al generar el PDF.');
  }
  return res.pdfBase64;
}

/** Convierte el base64 en un archivo y lo descarga en el navegador. */
function downloadBase64Pdf(b64: string, filename: string) {
  const cleaned = b64.includes('base64,') ? b64.split('base64,')[1] : b64;
  const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}