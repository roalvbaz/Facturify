'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { emitInvoiceAction } from '@/actions/invoice.actions';
import { showToast } from '@/lib/utils/toast';
import InvoicePDFTemplate from '@/components/invoicePDFTemplate';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Estados del formulario
  const [seriesCode, setSeriesCode] = useState('F');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  // Datos del cliente
  const [clientName, setClientName] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Impuestos globales y líneas
  const [globalVat, setGlobalVat] = useState(21);
  const [irpfRate, setIrpfRate] = useState(0);

  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 21 }
  ]);

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, vat_rate: globalVat }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // Cálculos en tiempo real
  const subtotal = lines.reduce((acc, l) => acc + (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0), 0);
  const vatTotal = lines.reduce((acc, l) => {
    const lineSub = (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0);
    const vatRate = parseFloat(String(l.vat_rate)) || globalVat;
    return acc + (lineSub * (vatRate / 100));
  }, 0);
  const irpfTotal = subtotal * (parseFloat(String(irpfRate)) / 100);
  const total = subtotal + vatTotal - irpfTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await emitInvoiceAction({
        seriesCode,
        customerData: {
          nombre: clientName,
          nif: clientTaxId,
          email: clientEmail,
          direccion: clientAddress,
        },
        lines,
      });

      if (result.success) {
        showToast.success('Factura emitida correctamente');
        router.push('/historial');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Error al emitir la factura');
    } finally {
      setLoading(false);
    }
  };

  // Objeto simulado para la vista previa en el modal A4
  const previewFactura = {
    id: 'preview-id',
    formatted_number: `${seriesCode}-2026-0001`,
    issued_at: issuedDate || new Date().toISOString(),
    client_name: clientName || 'Cliente General',
    client_tax_id: clientTaxId || '-',
    client_address: clientAddress || '-',
    lines: lines.map(l => ({
      description: l.description || 'Concepto sin descripción',
      quantity: l.quantity,
      unit_price_cents: Math.round((parseFloat(String(l.unit_price)) || 0) * 100),
      total_amount_cents: Math.round(((parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0) * (1 + (parseFloat(String(l.vat_rate)) || globalVat) / 100)) * 100),
    })),
    subtotal_cents: Math.round(subtotal * 100),
    vat_total_cents: Math.round(vatTotal * 100),
    irpf_total_cents: Math.round(irpfTotal * 100),
    total_cents: Math.round(total * 100),
    qr_code_url: 'https://www.agenciatributaria.es/qr?demo=true',
    invoice_hash: 'DEMO_HASH_VERIFACTU_PREVIEW',
  };

  const previewEmpresa = {
    name: 'Mi Empresa S.L.',
    tax_id: 'A12345678',
    address: 'Plazaola Kalea 25, Donostia',
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* CABECERA SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 4px 0' }}>Crear Factura</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Emite una nueva factura verificable (Veri*factu).</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            className="btn" 
            style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', fontWeight: 600 }}
            onClick={() => setShowPreview(true)}
          >
            <i className="fas fa-eye"></i> Vista Previa
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontWeight: 600 }}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            &nbsp; Guardar Factura
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* BLOQUE 1: DATOS DE FACTURA / FECHAS */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Nº Factura</label>
              <input 
                type="text" 
                value="Automático (al emitir)" 
                disabled 
                className="form-control" 
                style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8, cursor: 'not-allowed' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fecha Emisión</label>
              <input 
                type="date" 
                value={issuedDate} 
                onChange={(e) => setIssuedDate(e.target.value)} 
                className="form-control" 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fecha Vencimiento</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="form-control" 
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: DATOS DEL CLIENTE */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Datos del Cliente</h3>
            <select className="form-control" style={{ width: '220px', fontSize: '0.85rem' }} defaultValue="">
              <option value="" disabled>-- Cargar de mi directorio --</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <input 
                type="text" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                placeholder="Nombre / Razón Social" 
                className="form-control" 
              />
            </div>
            <div>
              <input 
                type="text" 
                value={clientTaxId} 
                onChange={(e) => setClientTaxId(e.target.value)} 
                placeholder="NIF / CIF" 
                className="form-control" 
              />
            </div>
            <div>
              <input 
                type="email" 
                value={clientEmail} 
                onChange={(e) => setClientEmail(e.target.value)} 
                placeholder="Correo Electrónico" 
                className="form-control" 
              />
            </div>
            <div>
              <input 
                type="text" 
                value={clientAddress} 
                onChange={(e) => setClientAddress(e.target.value)} 
                placeholder="Dirección Fiscal" 
                className="form-control" 
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: CONCEPTOS */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Conceptos</h3>
            <button type="button" className="btn" style={{ fontSize: '0.85rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem' }}>
              + Insertar del Catálogo <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {lines.map((line, index) => {
              const lineSubtotal = (parseFloat(String(line.quantity)) || 0) * (parseFloat(String(line.unit_price)) || 0);
              const lineVatAmount = lineSubtotal * ((parseFloat(String(line.vat_rate)) || globalVat) / 100);
              const lineTotal = lineSubtotal + lineVatAmount;

              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.2fr 1.5fr 1fr 40px', gap: '10px', alignItems: 'center', background: 'var(--bg-color)', padding: '0.6rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <input 
                      type="text" 
                      value={line.description} 
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)} 
                      placeholder="Descripción del producto/servicio" 
                      className="form-control" 
                      required 
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      step="any"
                      value={line.quantity} 
                      onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} 
                      className="form-control" 
                      required 
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      step="0.01"
                      value={line.unit_price} 
                      onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)} 
                      placeholder="Precio" 
                      className="form-control" 
                      required 
                    />
                  </div>
                  <div>
                    <select 
                      value={line.vat_rate} 
                      onChange={(e) => handleLineChange(index, 'vat_rate', e.target.value)} 
                      className="form-control"
                    >
                      <option value="21">General (21%)</option>
                      <option value="10">Reducido (10%)</option>
                      <option value="4">Superreducido (4%)</option>
                      <option value="0">Exento (0%)</option>
                    </select>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', paddingRight: '8px', color: 'var(--text-color)' }}>
                    {lineTotal.toFixed(2)} €
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => removeLine(index)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Eliminar línea"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            type="button" 
            onClick={addLine} 
            className="btn" 
            style={{ background: 'var(--bg-color)', border: '1px dashed var(--border-color)', color: 'var(--text-color)', fontWeight: 600, fontSize: '0.85rem' }}
          >
            + Añadir Línea Libre
          </button>
        </div>

        {/* BLOQUE 4: IMPUESTOS Y TOTALES (INFERIOR) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
          
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>IVA GENERAL (%)</label>
              <input 
                type="number" 
                value={globalVat} 
                onChange={(e) => setGlobalVat(Number(e.target.value))} 
                className="form-control" 
                style={{ width: '90px', textAlign: 'center' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>RETENCIÓN IRPF (%)</label>
              <input 
                type="number" 
                value={irpfRate} 
                onChange={(e) => setIrpfRate(Number(e.target.value))} 
                className="form-control" 
                style={{ width: '90px', textAlign: 'center' }} 
              />
            </div>
          </div>

          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span>Base Imponible:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{subtotal.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span>IVA Repercutido:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>+{vatTotal.toFixed(2)} €</span>
            </div>
            {irpfTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444' }}>
                <span>Retención IRPF:</span>
                <span style={{ fontWeight: 600 }}>-{irpfTotal.toFixed(2)} €</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '10px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-color)', marginTop: '4px' }}>
              <span>Total Final:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>

        </div>

      </form>

      {/* MODAL DE VISTA PREVIA A4 */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '2rem 1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '850px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            background: '#111827',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            color: 'white'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Vista Previa de Factura (Borrador A4)</span>
            <button 
              onClick={() => setShowPreview(false)}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cerrar
            </button>
          </div>
          <div style={{ background: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', borderRadius: '0.375rem', overflow: 'hidden' }}>
            <InvoicePDFTemplate factura={previewFactura} empresa={previewEmpresa} />
          </div>
        </div>
      )}
    </div>
  );
}