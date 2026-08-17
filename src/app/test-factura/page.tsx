'use client';

import { emitInvoiceAction } from '@/actions/invoice.actions';

export default function TestPage() {
  const handleEmitir = async () => {
    try {
        const resultado = await emitInvoiceAction({
            companyId: "3d8febcd-526c-4424-93f8-d8e61b6ee0df", // pon tu UUID aquí directamente o la variable
            seriesCode: "F",
            lines: [
              {
                description: "Prueba de desarrollo Veri*factu",
                quantity: 1,
                unitPriceCents: 10000,
                vatPercent: 21,
              }
            ]
        });

      console.log("¡Factura emitida con éxito!", resultado);
      alert("Factura emitida correctamente. Revisa la consola.");
    } catch (error: any) {
      console.error("Error al emitir:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Banco de Pruebas Veri*factu</h1>
      <p>Haz clic en el botón para emitir una factura de prueba de forma atómica.</p>
      <button 
        onClick={handleEmitir}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Emitir Factura de Prueba
      </button>
    </div>
  );
}