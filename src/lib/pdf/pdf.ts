export function descargarFacturaPDF(elementoHtml: HTMLElement, numeroFactura: string) {
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
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all'] },
    };

    // @ts-ignore
    window.html2pdf().set(opciones).from(elementoHtml).save();
  } else {
    alert("La librería de PDF aún se está cargando. Inténtalo de nuevo en un segundo.");
  }
}

export async function generarFacturaBase64PDF(elementoHtml: HTMLElement): Promise<string | null> {
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
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all'] },
    };

    // @ts-ignore
    const pdfDataUri = await window.html2pdf()
      .set(opciones)
      .from(elementoHtml)
      .outputPdf('datauristring');
      
    return pdfDataUri;
  }
  return null;
}