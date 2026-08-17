export function descargarFacturaPDF(elementoHtml: HTMLElement, numeroFactura: string) {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.html2pdf) {
    const opciones = {
      margin: 10,
      filename: `Factura_${numeroFactura || 'Borrador'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().set(opciones).from(elementoHtml).save();
  } else {
    alert("La librería de PDF aún se está cargando. Inténtalo de nuevo en un segundo.");
  }
}