/**
 * Descarga / adjunto del PDF de factura — versión CLIENTE.
 *
 * El PDF se genera EN EL SERVIDOR con @react-pdf/renderer (ver
 * `src/lib/pdf/invoicePdf.ts`) a través de la server action
 * `getInvoicePdfBase64Action`. Aquí solo recibimos el base64 y lo entregamos
 * como descarga o como data string para el email.
 *
 * Se acabó la dependencia de html2pdf.js/html2canvas (CDN externo + parseo de
 * colores modernos): el render en servidor nunca se cuelga ni revienta.
 */

import { getInvoicePdfBase64Action } from '@/actions/invoice.actions';

/**
 * Descarga el PDF de una factura guardada.
 * Resuelve al terminar o rechaza con un mensaje claro para la toast.
 */
export async function descargarFacturaPDF(
  invoiceId: string,
  numeroFactura: string
): Promise<void> {
  if (!invoiceId) throw new Error('No se encontró la factura para generar el PDF.');

  const res = await getInvoicePdfBase64Action(invoiceId);
  if (!res?.success || !res.pdfBase64) {
    throw new Error(res?.error || 'Error al generar el PDF.');
  }

  downloadBase64Pdf(res.pdfBase64, `Factura_${numeroFactura || 'Documento'}.pdf`);
}

/**
 * Genera el PDF (base64) de una factura guardada, para adjuntarlo en el email.
 * Rechaza la promesa si falla para que el modal muestre la toast.
 */
export async function generarFacturaBase64PDF(invoiceId: string): Promise<string> {
  if (!invoiceId) throw new Error('No se encontró la factura para generar el PDF.');

  const res = await getInvoicePdfBase64Action(invoiceId);
  if (!res?.success || !res.pdfBase64) {
    throw new Error(res?.error || 'Error al generar el PDF.');
  }
  return res.pdfBase64; // base64 puro (sin prefijo data:), compatible con el email
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