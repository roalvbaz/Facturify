/**
 * Descarga una factura como PDF usando html2pdf.js (cargado desde CDN).
 * Si html2pdf no está listo, reintenta brevemente antes de mostrar error.
 */
export function descargarFacturaPDF(elementoHtml: HTMLElement, numeroFactura: string) {
  const attempt = (retries = 5) => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.html2pdf) {
      const opciones = {
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
          // Permitir que html2canvas renderice el elemento completo
          windowWidth: elementoHtml.scrollWidth,
          windowHeight: elementoHtml.scrollHeight,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
        pagebreak: { mode: ['avoid-all'] },
      };

      // @ts-ignore
      window.html2pdf().set(opciones).from(elementoHtml).save();
    } else if (retries > 0) {
      // La librería CDN aún no cargó — esperar 500ms y reintentar
      setTimeout(() => attempt(retries - 1), 500);
    } else {
      alert("La librería de PDF no se pudo cargar. Recarga la página e inténtalo de nuevo.");
    }
  };

  attempt();
}

/**
 * Genera un PDF en base64 (data URI) para enviar por email.
 */
export async function generarFacturaBase64PDF(elementoHtml: HTMLElement): Promise<string | null> {
  const attempt = async (retries = 5): Promise<string | null> => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.html2pdf) {
      const opciones = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: elementoHtml.scrollWidth,
          windowHeight: elementoHtml.scrollHeight,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
        pagebreak: { mode: ['avoid-all'] },
      };

      // @ts-ignore
      const pdfDataUri = await window.html2pdf()
        .set(opciones)
        .from(elementoHtml)
        .outputPdf('datauristring');

      return pdfDataUri;
    } else if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return attempt(retries - 1);
    }
    return null;
  };

  return attempt();
}
