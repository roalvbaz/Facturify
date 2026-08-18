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
  const [clientName, setClientName] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 21 }
  ]);

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, vat_rate: 21 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // Cálculos en tiempo real para totales y vista previa
  const subtotal = lines.reduce((acc, l) => acc + (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0), 0);
  const vatTotal = lines.reduce((acc, l) => {
    const lineSub = (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0);
    const vatRate = parseFloat(String(l.vat_rate)) || 21;
    return acc + (lineSub * (vatRate / 100));
  }, 0);
  const total = subtotal + vatTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await emitInvoiceAction({
        seriesCode,
        customerData: {
          nombre: clientName,
          nif: clientTaxId,
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

  // Objeto de factura simulado para alimentar el modal de vista previa
  const previewFactura = {
    id: 'preview-id',
    formatted_number: `${seriesCode}-2026-0001`,
    issued_at: new Date().toISOString(),
    client_name: clientName || 'Cliente General',
    client_tax_id: clientTaxId || '-',
    client_address: clientAddress || '-',
    lines: lines.map(l => ({
      description: l.description || 'Concepto sin descripción',
      quantity: l.quantity,
      unit_price_cents: Math.round((parseFloat(String(l.unit_price)) || 0) * 100),
      total_amount_cents: Math.round(((parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0) * (1 + (parseFloat(String(l.vat_rate)) || 21) / 100)) * 100),
    })),
    subtotal_cents: Math.round(subtotal * 100),
    vat_total_cents: Math.round(vatTotal * 100),
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
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Emitir Nueva Factura</h2>
          <p>Rellena los datos del cliente y los conceptos. El sistema gestionará el directorio y el cifrado Veri*factu automáticamente.</p>
        </div>
        <div>
          <button 
            type="button" 
            className="btn" 
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
            onClick={() => setShowPreview(true)}
          >
            <i className="fas fa-eye"></i> Vista Previa
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        {/* 1. Datos de Emisión */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563', marginBottom: '1rem', textTransform: 'uppercase' }}>
            1. Datos de Emisión
          </h3>
          <div style={{ maxWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem' }}>Serie de Facturación</label>
            <input 
              type="text" 
              value={seriesCode} 
              onChange={(e) => setSeriesCode(e.target.value)} 
              className="form-control" 
              required 
            />
          </div>
        </div>

        {/* 2. Datos del Cliente */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563', marginBottom: '1rem', textTransform: 'uppercase' }}>
            2. Datos del Cliente
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem' }}>Nombre o Razón Social</label>
              <input 
                type="text" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                placeholder="Ej. Juan Pérez / Empresa S.A." 
                className="form-control" 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem' }}>NIF / CIF</label>
              <input 
                type="text" 
                value={clientTaxId} 
                onChange={(e) => setClientTaxId(e.target.value)} 
                placeholder="Ej. 12345678Z" 
                className="form-control" 
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem' }}>Dirección Fiscal</label>
            <textarea 
              value={clientAddress} 
              onChange={(e) => setClientAddress(e.target.value)} 
              placeholder="Calle, número, código postal, ciudad..." 
              className="form-control" 
              rows={2} 
            />
          </div>
        </div>

        {/* 3. Conceptos de Facturación */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', margin: 0 }}>
              3. Conceptos de Facturación
            </h3>
            <button type="button" onClick={addLine} className="btn btn-primary" style={{ fontSize: '12px', padding: '0.4rem 0.8rem', width: 'auto' }}>
              <i className="fas fa-plus"></i> Añadir Línea
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lines.map((line, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 40px', gap: '10px', alignItems: 'center', background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Descripción</label>
                  <input 
                    type="text" 
                    value={line.description} 
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)} 
                    placeholder="Descripción del concepto" 
                    className="form-control" 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Cantidad</label>
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
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Precio Ud. (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={line.unit_price} 
                    onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)} 
                    className="form-control" 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>IVA (%)</label>
                  <select 
                    value={line.vat_rate} 
                    onChange={(e) => handleLineChange(index, 'vat_rate', e.target.value)} 
                    className="form-control"
                  >
                    <option value="21">21%</option>
                    <option value="10">10%</option>
                    <option value="4">4%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div style={{ textAlign: 'center', paddingTop: '1.2rem' }}>
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
            ))}
          </div>
        </div>

        {/* 4. Totales Resumen */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ width: '300px', background: '#f9fafb', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#4b5563' }}>
              <span>Base Imponible:</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#4b5563' }}>
              <span>IVA Repercutido:</span>
              <span>{vatTotal.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: '10px', fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
              <span>TOTAL:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Botón de envío final */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            &nbsp; Emitir y Firmar (Veri*factu)
          </button>
        </div>
      </form>

      {/* MODAL DE VISTA PREVIA */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Vista Previa de Factura (Borrador A4)</span>
            <button 
              onClick={() => setShowPreview(false)}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cerrar Vista Previa
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