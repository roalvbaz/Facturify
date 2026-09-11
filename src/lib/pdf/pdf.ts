/**
 * Generación de PDF de facturas.
 *
 * PROBLEMA QUE RESUELVE: html2canvas (motor de html2pdf.js 0.10.1) no soporta
 * funciones de color modernas (`oklch()` / `lab()`), que Tailwind v4 inyecta en
 * el CSS de la app. Al capturar la factura leía esas hojas de estilo y reventaba
 * con "Attempting to parse an unsupported color function lab".
 *
 * SOLUCIÓN: la factura se copia a un <iframe> aislado (sin el CSS de la app,
 * solo sus estilos inline + las fuentes de las plantillas) y html2pdf se carga
 * DENTRO de ese iframe. Así html2canvas trabaja en un documento del mismo window
 * y sin ningún oklch() que no sepa parsear. Además todo va con tiempo máximo:
 * la generación nunca se queda colgada.
 */

const HTML2PDF_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

const FONTS_CSS =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />';

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Garantiza que la generación nunca se colgada para siempre. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Tiempo agotado generando el PDF. Inténtalo de nuevo.')),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Carga html2pdf DENTRO del documento del iframe. */
function loadHtml2pdfInside(doc: Document): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = HTML2PDF_CDN;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error('No se pudo cargar la librería de PDF. Comprueba tu conexión.')
      );
    doc.head.appendChild(script);
  });
}

async function mountInvoiceInIframe(elementoHtml: HTMLElement): Promise<{
  iframe: HTMLIFrameElement;
  elem: HTMLElement;
}> {
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
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) throw new Error('No se pudo aislar la factura para el PDF');

  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8" />' +
      FONTS_CSS +
      '<style>html,body{margin:0;padding:0;background:#ffffff;}</style>' +
      `</head><body>${elementoHtml.outerHTML}</body></html>`
  );
  doc.close();

  // Esperar a que las fuentes de las plantillas estén listas (tope 5 s).
  try {
    await withTimeout(Promise.resolve(doc.fonts?.ready).catch(() => undefined), 5000);
  } catch {
    /* continuamos igualmente */
  }

  // html2pdf dentro del iframe: window y documento del MISMO origen limpio.
  await loadHtml2pdfInside(doc);

  const elem = doc.getElementById(elementoHtml.id);
  if (!elem) throw new Error('No se encontró la factura para generar el PDF');

  return { iframe, elem };
}

function unmountIframe(iframe: HTMLIFrameElement) {
  setTimeout(() => {
    if (iframe.parentElement) iframe.parentElement.removeChild(iframe);
  }, 0);
}

function buildPdfOptions(numeroFactura: string) {
  return {
    margin: 0,
    filename: `Factura_${numeroFactura || 'Borrador'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };
}

/**
 * Descarga la factura como PDF. Resuelve al terminar y rechaza con un mensaje
 * claro si algo falla (para que la UI muestre la toast).
 */
export async function descargarFacturaPDF(
  elementoHtml: HTMLElement,
  numeroFactura: string
): Promise<void> {
  if (!elementoHtml?.id) throw new Error('No se encontró la factura para generar el PDF.');

  await withTimeout(
    (async () => {
      const { iframe, elem } = await mountInvoiceInIframe(elementoHtml);
      try {
        const w = iframe.contentWindow as Window & { html2pdf?: any };
        if (!w?.html2pdf) throw new Error('La librería de PDF no está disponible.');
        await w.html2pdf().set(buildPdfOptions(numeroFactura)).from(elem).save();
      } finally {
        unmountIframe(iframe);
      }
    })(),
    30000
  );
}

/**
 * Genera el PDF en base64 (data URI) para adjuntar en el email.
 * Rechaza la promesa si falla para que el modal muestre la toast.
 */
export async function generarFacturaBase64PDF(elementoHtml: HTMLElement): Promise<string> {
  if (!elementoHtml?.id) throw new Error('No se encontró la factura para generar el PDF.');

  return withTimeout(
    (async () => {
      const { iframe, elem } = await mountInvoiceInIframe(elementoHtml);
      try {
        const w = iframe.contentWindow as Window & { html2pdf?: any };
        if (!w?.html2pdf) throw new Error('La librería de PDF no está disponible.');
        const dataUri = await w
          .html2pdf()
          .set(buildPdfOptions('Email'))
          .from(elem)
          .outputPdf('datauristring');
        if (typeof dataUri !== 'string' || dataUri.length === 0) {
          throw new Error('El PDF se generó vacío, no se pudo adjuntar.');
        }
        return dataUri;
      } finally {
        unmountIframe(iframe);
      }
    })(),
    30000
  );
}