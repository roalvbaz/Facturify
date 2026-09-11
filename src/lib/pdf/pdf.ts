/**
 * Generación de PDF de facturas.
 *
 * PROBLEMA RESUELTO: html2canvas (el motor de html2pdf.js 0.10.1) no soporta
 * funciones de color modernas (`oklch()` / `lab()`), que Tailwind v4 inyecta
 * en el CSS de la app. Al intentar capturar el elemento de la factura, leía
 * esas hojas de estilo y reventaba con:
 *     "Attempting to parse an unsupported color function lab"
 *
 * SOLUCIÓN: renderizar la factura aislada dentro de un <iframe> sin estilos
 * de la app (solo sus estilos inline + las fuentes de las plantillas). El
 * elemento InvoicePDFTemplate usa 100% estilos inline, así que se ve idéntico
 * y html2canvas no encuentra ningún `oklch()` que no sepa parsear.
 */

const FONTS_CSS =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />';

/** Espera razonable de fuentes/imágenes (no bloquear para siempre). */
function waitForReady(doc: Document, timeoutMs = 4000): Promise<void> {
  const ready =
    doc.fonts?.ready ??
    Promise.resolve();
  return Promise.race([
    ready.then(() => Promise.resolve()),
    new Promise<void>((r) => setTimeout(r, timeoutMs)),
  ]);
}

/**
 * Monta el HTML de la factura en un iframe oculto y espera a que cargue
 * fuentes e imágenes. Devuelve el iframe; el llamador lo elimina tras
 * generar el PDF.
 */
function mountInvoiceInIframe(elementoHtml: HTMLElement): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    iframe.style.background = '#ffffff';
    iframe.style.pointerEvents = 'none';

    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      reject(new Error('No se pudo aislar la factura para el PDF'));
      return;
    }
    if (!doc) {
      reject(new Error('No se pudo aislar la factura para el PDF'));
      return;
    }

    // Clonamos el elemento tal cual (sus estilos inline viajan con él).
    const html =
      `<!doctype html><html><head><meta charset="utf-8" />${FONTS_CSS}` +
      `<style>html,body{margin:0;padding:0;background:#ffffff;}</style>` +
      `</head><body>${elementoHtml.outerHTML}</body></html>`;

    doc.open();
    doc.write(html);
    doc.close();

    document.body.appendChild(iframe);

    const cleanup = (err?: unknown) => {
      setTimeout(() => {
        if (iframe.parentElement) iframe.parentElement.removeChild(iframe);
        if (err) reject(err);
      }, 0);
    };

    waitForReady(doc)
      .then(() => cleanup())
      .catch(cleanup);
  });
}

/** Opciones comunes de html2pdf para una factura. */
function pdfOptions(numeroFactura: string) {
  return {
    margin: 0,
    filename: `Factura_${numeroFactura || 'Borrador'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      // Capturamos ya aislados en el iframe; animamos con el broadest canvas.
      backgroundColor: '#ffffff',
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
    },
  };
}

/** Devuelve el elemento de la factura dentro del iframe (por su id). */
function invoiceElementInIframe(iframe: HTMLIFrameElement, id: string): HTMLElement | null {
  const doc = iframe.contentDocument;
  if (!doc) return null;
  return doc.getElementById(id);
}

/** Después de usar el iframe, retirarlo del DOM (fuego y olvido). */
function unmountIframe(iframe: HTMLIFrameElement) {
  setTimeout(() => {
    if (iframe.parentElement) iframe.parentElement.removeChild(iframe);
  }, 0);
}

/** Comprueba que html2pdf (CDN) está disponible, reintentando un momento. */
function getHtml2pdf(): any {
  // @ts-ignore - librería global cargada desde CDN en layout.tsx
  return typeof window !== 'undefined' ? (window as any).html2pdf : undefined;
}

/**
 * Descarga la factura como PDF. Devuelve una promesa que resuelve cuando el
 * PDF está generado y rechaza si algo falla (para mostrar la toast al usuario).
 */
export async function descargarFacturaPDF(elementoHtml: HTMLElement, numeroFactura: string): Promise<void> {
  if (!elementoHtml?.id) throw new Error('No se encontró la factura para generar el PDF.');

  const html2pdf = getHtml2pdf();
  if (!html2pdf) throw new Error('La librería de PDF aún no está cargada. Recarga la página e inténtalo de nuevo.');

  const iframe = await mountInvoiceInIframe(elementoHtml);
  try {
    const elem = invoiceElementInIframe(iframe, elementoHtml.id);
    if (!elem) throw new Error('No se pudo generar el PDF de la factura.');

    // El worker de html2pdf es thenable: podemos await hasta que acabe.
    await html2pdf().set(pdfOptions(numeroFactura)).from(elem).save();
  } finally {
    unmountIframe(iframe);
  }
}

/**
 * Genera el PDF en base64 (data URI) para adjuntar en el email.
 * Rechaza la promesa si falla la conversión.
 */
export async function generarFacturaBase64PDF(elementoHtml: HTMLElement): Promise<string> {
  if (!elementoHtml?.id) throw new Error('No se encontró la factura para generar el PDF.');

  const html2pdf = getHtml2pdf();
  if (!html2pdf) throw new Error('La librería de PDF aún no está cargada. Recarga la página e inténtalo de nuevo.');

  const iframe = await mountInvoiceInIframe(elementoHtml);
  try {
    const elem = invoiceElementInIframe(iframe, elementoHtml.id);
    if (!elem) throw new Error('No se pudo generar el PDF de la factura.');

    const opciones = pdfOptions('Email');
    const dataUri = await html2pdf().set(opciones).from(elem).outputPdf('datauristring');
    if (typeof dataUri !== 'string' || dataUri.length === 0) {
      throw new Error('El PDF se generó vacío, no se pudo adjuntar.');
    }
    return dataUri;
  } finally {
    unmountIframe(iframe);
  }
}