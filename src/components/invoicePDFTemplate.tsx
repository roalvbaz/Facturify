export default function InvoicePDFTemplate({ factura, empresa }: { factura: any, empresa: any }) {
  return (
    <div id={`printable-invoice-${factura.id}`} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm 20mm',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 15px rgba(0,0,0,0.1)'
    }}>
      {/* Contenedor forzado a dimensiones estándar de A4 vertical */}
      
      {/* 1. CABECERA: Datos Emisor y Número de Factura */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111827', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#111827', textTransform: 'uppercase' }}>
            {empresa?.name || empresa?.nombre || 'MI EMPRESA S.L.'}
          </h1>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#4B5563' }}>NIF: {empresa?.tax_id || empresa?.nif || '-'}</p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#4B5563', whiteSpace: 'pre-wrap', maxWidth: '250px' }}>
            {empresa?.address || empresa?.direccion || 'Dirección fiscal no configurada'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 10px 0', color: '#111827', letterSpacing: '2px' }}>FACTURA</h2>
          <table style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 15px', color: '#6B7280', fontWeight: 'bold' }}>Nº Factura:</td>
                <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#111827' }}>{factura.formatted_number}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 15px', color: '#6B7280', fontWeight: 'bold' }}>Fecha:</td>
                <td style={{ padding: '4px 0', color: '#111827' }}>{factura.issued_at ? new Date(factura.issued_at).toLocaleDateString('es-ES') : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. DATOS DEL CLIENTE */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #E5E7EB', display: 'inline-block', paddingBottom: '4px' }}>
          Facturar a:
        </h3>
        <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111827' }}>{factura.client_name || 'Cliente General'}</p>
        <p style={{ margin: '2px 0', fontSize: '14px', color: '#374151' }}>NIF/CIF: {factura.client_tax_id || '-'}</p>
        <p style={{ margin: '2px 0', fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', maxWidth: '300px' }}>{factura.client_address || '-'}</p>
      </div>

      {/* 3. TABLA DE CONCEPTOS (Ocupa el espacio restante) */}
      <div style={{ flexGrow: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #D1D5DB' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#374151', width: '50%' }}>CONCEPTO</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>CANT.</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>PRECIO UD.</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {factura.lines && factura.lines.length > 0 ? (
              factura.lines.map((l: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px', color: '#111827' }}>{l.description}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '14px', color: '#4B5563' }}>{l.quantity}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '14px', color: '#4B5563' }}>{((l.unit_price_cents || 0) / 100).toFixed(2)} €</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>{((l.total_amount_cents || 0) / 100).toFixed(2)} €</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '14px' }}>Sin líneas de detalle registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALES (Abajo a la derecha) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <table style={{ width: '280px', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4B5563' }}>Base Imponible:</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>{((factura.subtotal_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4B5563', borderBottom: '2px solid #E5E7EB' }}>IVA (21%):</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#111827', borderBottom: '2px solid #E5E7EB' }}>{((factura.vat_total_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>TOTAL:</td>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '18px', fontWeight: 900, color: '#111827' }}>{((factura.total_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. PIE DE PÁGINA: Avisos legales y QR (Opcional) */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '15px', fontSize: '11px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ width: '70%' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#374151' }}>Normativa Veri*factu y Ley Antifraude:</p>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            Factura generada conforme al Reglamento que regula los requisitos de los sistemas informáticos de facturación.
          </p>
        </div>
      </div>

    </div>
  );
}