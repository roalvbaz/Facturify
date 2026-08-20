export default function InvoicePDFTemplate({ 
  factura, 
  empresa, 
  settings 
}: { 
  factura: any; 
  empresa: any; 
  settings?: any;
}) {
  const isRectification = 
    factura.series_code === 'R' || 
    factura.formatted_number?.startsWith('R-') || 
    Boolean(factura.rectifies_invoice_id);

  const primaryColor = isRectification 
    ? '#dc2626' 
    : (settings?.theme_color || empresa?.theme_color || '#4f46e5');

  const logoUrl = settings?.logo_url || empresa?.logo_url || null;

  return (
    <div 
      id={`printable-invoice-${factura.id || 'preview'}`} 
      style={{
        width: '210mm',
        height: '290mm', // Altura fija calibrada para evitar la creación de la página 2
        padding: '12mm 15mm',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between', // Empuja cabecera/conceptos arriba y totales/pie abajo
        overflow: 'hidden', // Bloquea desbordamientos accidentales
      }}
    >
      {/* SECCIÓN SUPERIOR: CABECERA, CLIENTE Y LÍNEAS DE CONCEPTOS */}
      <div>
        {/* CABECERA (DATOS EMISOR Y DOCUMENTO) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `3px solid ${primaryColor}`, marginBottom: '14px', paddingBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ width: '55%', verticalAlign: 'top', paddingBottom: '8px' }}>
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{ maxHeight: '40px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px', display: 'block' }} 
                  />
                )}
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                  {empresa?.name || empresa?.nombre || 'FACTURIFY'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>
                  NIF: {empresa?.tax_id || empresa?.nif || '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', maxWidth: '280px', lineHeight: '1.3' }}>
                  {empresa?.address || empresa?.direccion || 'Dirección fiscal no configurada'}
                </div>
              </td>
              <td style={{ width: '45%', verticalAlign: 'top', textAlign: 'right', paddingBottom: '8px' }}>
                <div style={{ fontSize: isRectification ? '16px' : '22px', fontWeight: 'bold', color: primaryColor, marginBottom: '6px' }}>
                  {isRectification ? 'FACTURA RECTIFICATIVA' : 'FACTURA'}
                </div>
                <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 6px', color: '#64748b', fontWeight: 'bold', textAlign: 'right' }}>Nº Documento:</td>
                      <td style={{ padding: '2px 0', fontWeight: 'bold', color: '#0f172a', textAlign: 'right' }}>{factura.formatted_number}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 6px', color: '#64748b', fontWeight: 'bold', textAlign: 'right' }}>Fecha Emisión:</td>
                      <td style={{ padding: '2px 0', color: '#0f172a', textAlign: 'right' }}>
                        {factura.issued_at ? new Date(factura.issued_at).toLocaleDateString('es-ES') : '-'}
                      </td>
                    </tr>
                    {factura.due_date && (
                      <tr>
                        <td style={{ padding: '2px 6px', color: '#64748b', fontWeight: 'bold', textAlign: 'right' }}>Vencimiento:</td>
                        <td style={{ padding: '2px 0', color: '#0f172a', textAlign: 'right' }}>
                          {new Date(factura.due_date).toLocaleDateString('es-ES')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* RECTIFICACIÓN (SI APLICA) */}
        {isRectification && (
          <div style={{ marginBottom: '12px', padding: '6px 10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', marginBottom: '2px' }}>
              Documento de Rectificación (RD 1619/2012)
            </div>
            <div style={{ fontSize: '11px', color: '#7f1d1d' }}>
              <strong>Motivo:</strong> {factura.rectification_reason || 'R1 - Error fundado en derecho / rectificación de importes'}
            </div>
          </div>
        )}

        {/* DATOS DEL CLIENTE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', backgroundColor: '#f8fafc', borderLeft: `4px solid ${primaryColor}` }}>
          <tbody>
            <tr>
              <td style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                  FACTURAR A:
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                  {factura.client_name || 'Cliente General'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>
                  NIF/CIF: <strong>{factura.client_tax_id || '-'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  {factura.client_address || '-'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TABLA DE CONCEPTOS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid #e2e8f0`, backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', color: '#475569', width: '52%' }}>CONCEPTO</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', width: '12%' }}>CANT.</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', color: '#475569', width: '18%' }}>PRECIO UD.</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', color: '#475569', width: '18%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {factura.lines && factura.lines.length > 0 ? (
              factura.lines.map((l: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 8px', fontSize: '11px', color: '#0f172a' }}>{l.description}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                    {parseFloat(l.quantity || 1).toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                    {((l.unit_price_cents || 0) / 100).toFixed(2)} €
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>
                    {((l.total_amount_cents || 0) / 100).toFixed(2)} €
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '11px' }}>
                  Sin conceptos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN INFERIOR: TOTALES Y PIE DE PÁGINA ANCLADOS ABAJO */}
      <div>
        {/* TOTALES */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
          <tbody>
            <tr>
              <td style={{ width: '55%' }}></td>
              <td style={{ width: '45%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 6px', textAlign: 'right', color: '#64748b' }}>Base Imponible:</td>
                      <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                        {((factura.subtotal_cents || 0) / 100).toFixed(2)} €
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 6px', textAlign: 'right', color: '#64748b' }}>IVA Repercutido:</td>
                      <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                        {((factura.vat_total_cents || 0) / 100).toFixed(2)} €
                      </td>
                    </tr>
                    {factura.irpf_total_cents && factura.irpf_total_cents > 0 ? (
                      <tr>
                        <td style={{ padding: '2px 6px', textAlign: 'right', color: '#64748b' }}>Retención IRPF:</td>
                        <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                          -{((factura.irpf_total_cents || 0) / 100).toFixed(2)} €
                        </td>
                      </tr>
                    ) : null}
                    <tr style={{ borderTop: `2px solid ${primaryColor}` }}>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: primaryColor }}>TOTAL:</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: primaryColor }}>
                        {((factura.total_cents || 0) / 100).toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* PIE DE PÁGINA VERI*FACTU */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle', width: '80%', paddingRight: '12px', paddingTop: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155', marginBottom: '2px' }}>
                  Factura Verificada (Veri*factu)
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.2', marginBottom: '2px' }}>
                  Emitido al amparo del Reglamento que regula los requisitos de los sistemas informáticos de facturación (Real Decreto 1007/2023).
                </div>
                <div style={{ fontSize: '9px', color: primaryColor, fontWeight: 'bold' }}>
                  Generado de forma segura con Facturify
                </div>
              </td>
              <td style={{ verticalAlign: 'middle', width: '20%', textAlign: 'right', paddingTop: '6px' }}>
                {factura.qr_code_url ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(factura.qr_code_url)}`} 
                    alt="QR" 
                    style={{ width: '44px', height: '44px', border: '1px solid #e2e8f0', padding: '2px', backgroundColor: '#ffffff', display: 'inline-block' }} 
                  />
                ) : (
                  <div style={{ width: '44px', height: '44px', border: '1px dashed #cbd5e1', display: 'inline-block', lineHeight: '44px', fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>
                    QR
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}