export default function InvoicePDFTemplate({ factura, empresa }: { factura: any, empresa: any }) {
  return (
    <div id={`printable-invoice-${factura.id}`} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm 20mm',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 15px rgba(0,0,0,0.1)'
    }}>
      {/* 1. CABECERA: Datos Emisor y Número de Factura */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #111827', paddingBottom: '15px', marginBottom: '25px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 4px 0', color: '#111827', letterSpacing: '0.5px' }}>
            {empresa?.name || empresa?.nombre || 'FACTURIFY'}
          </h1>
          <p style={{ margin: '2px 0', fontSize: '11px', color: '#4B5563' }}>NIF: {empresa?.tax_id || empresa?.nif || '-'}</p>
          <p style={{ margin: '2px 0', fontSize: '11px', color: '#4B5563', whiteSpace: 'pre-wrap', maxWidth: '250px' }}>
            {empresa?.address || empresa?.direccion || 'Dirección fiscal no configurada'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 8px 0', color: '#111827', letterSpacing: '1px' }}>FACTURA</h2>
          <table style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 10px', color: '#4B5563', fontWeight: 'bold' }}>Nº Factura:</td>
                <td style={{ padding: '2px 0', fontWeight: 'bold', color: '#111827' }}>{factura.formatted_number}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 10px', color: '#4B5563', fontWeight: 'bold' }}>Fecha:</td>
                <td style={{ padding: '2px 0', color: '#111827' }}>{factura.issued_at ? new Date(factura.issued_at).toLocaleDateString('es-ES') : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. DATOS DEL CLIENTE */}
      <div style={{ marginBottom: '35px' }}>
        <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
          FACTURAR A:
        </h3>
        <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 2px 0', color: '#111827' }}>{factura.client_name || 'Cliente General'}</p>
        <p style={{ margin: '2px 0', fontSize: '12px', color: '#374151' }}>NIF/CIF: {factura.client_tax_id || '-'}</p>
        <p style={{ margin: '2px 0', fontSize: '12px', color: '#374151', whiteSpace: 'pre-wrap', maxWidth: '300px' }}>{factura.client_address || '-'}</p>
      </div>

      {/* 3. TABLA DE CONCEPTOS */}
      <div style={{ flexGrow: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #D1D5DB' }}>
              <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#111827', width: '55%' }}>CONCEPTO</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#111827' }}>CANT.</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#111827' }}>PRECIO UD.</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#111827' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {factura.lines && factura.lines.length > 0 ? (
              factura.lines.map((l: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '10px 6px', fontSize: '13px', color: '#111827' }}>{l.description}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>{parseFloat(l.quantity).toFixed(6)}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', fontSize: '13px', color: '#374151' }}>{((l.unit_price_cents || 0) / 100).toFixed(2)} €</td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>{((l.total_amount_cents || 0) / 100).toFixed(2)} €</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '13px' }}>Sin líneas de detalle registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALES (Abajo a la derecha) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <table style={{ width: '260px', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4B5563' }}>Base Imponible:</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>{((factura.subtotal_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4B5563' }}>IVA Repercutido:</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>{((factura.vat_total_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
            {factura.irpf_total_cents && factura.irpf_total_cents > 0 ? (
              <tr>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4B5563' }}>Retención IRPF:</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#EF4444' }}>-{((factura.irpf_total_cents || 0) / 100).toFixed(2)} €</td>
              </tr>
            ) : null}
            <tr>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>TOTAL:</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '16px', fontWeight: 900, color: '#111827' }}>{((factura.total_cents || 0) / 100).toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. PIE DE PÁGINA: Normativa Veri*factu y Código QR */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', fontSize: '10px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        <div style={{ width: '70%' }}>
          <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#374151' }}>
            Factura Verificada (Veri*factu)[cite: 2]
          </p>
          <p style={{ margin: 0, lineHeight: 1.3 }}>
            Emitido al amparo del Reglamento que regula los requisitos de los sistemas informáticos de facturación (Real Decreto 1007/2023). Sistema Veri*factu[cite: 2].
          </p>
        </div>
        
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {factura.qr_code_url ? (
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(factura.qr_code_url)}`} 
              alt="Código QR Veri*factu" 
              style={{ width: '65px', height: '65px', border: '1px solid #E5E7EB', padding: '2px', backgroundColor: 'white' }} 
            />
          ) : (
            <div style={{ width: '65px', height: '65px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#9CA3AF', textAlign: 'center', backgroundColor: '#F9FAFB' }}>
              QR Veri*factu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}