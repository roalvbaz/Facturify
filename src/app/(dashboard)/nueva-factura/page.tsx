'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { emitInvoiceAction, getActiveCompanyAction, getCompanyCustomersAction } from '@/actions/invoice.actions';
import { showToast } from '@/lib/utils/toast';
import InvoiceModalClient from '@/components/invoiceModalClient';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estado para la empresa real
  const [empresa, setEmpresa] = useState<{ id?: string; name: string; nif: string; address: string }>({
    name: 'Cargando empresa...',
    nif: '',
    address: '',
  });

  // Estado para el directorio de clientes
  const [customerList, setCustomerList] = useState<Array<{
    id: string;
    name: string;
    tax_id: string;
    email: string | null;
    address: string | null;
  }>>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [compRes, custRes] = await Promise.all([
          getActiveCompanyAction(),
          getCompanyCustomersAction(),
        ]);

        if (compRes?.company) {
          setEmpresa({
            id: compRes.company.id,
            name: compRes.company.name,
            nif: compRes.company.tax_id || '',
            address: compRes.company.address || '',
          });
        }

        if (custRes?.customers) {
          setCustomerList(custRes.customers);
        }
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
      }
    }
    loadData();
  }, []);

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

  const handleSelectCustomer = (customerId: string) => {
    const selected = customerList.find((c) => c.id === customerId);
    if (selected) {
      setClientName(selected.name || '');
      setClientTaxId(selected.tax_id || '');
      setClientEmail(selected.email || '');
      setClientAddress(selected.address || '');
    }
  };

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  // Objeto de factura en vivo
  const previewFactura = {
    id: 'preview-id',
    formatted_number: `${seriesCode}-2026-0001`,
    issued_at: issuedDate || new Date().toISOString(),
    client_name: clientName || 'Cliente General',
    client_tax_id: clientTaxId || '-',
    client_address: clientAddress || '-',
    lines: lines.map((l) => {
      const qty = parseFloat(String(l.quantity)) || 0;
      const unitPrice = parseFloat(String(l.unit_price)) || 0;
      const vatRate = parseFloat(String(l.vat_rate)) || globalVat;
      const lineSub = qty * unitPrice;
      const lineTotal = lineSub * (1 + vatRate / 100);
      return {
        description: l.description || 'Concepto sin descripción',
        quantity: l.quantity,
        unit_price_cents: Math.round(unitPrice * 100),
        total_amount_cents: Math.round(lineTotal * 100),
      };
    }),
    subtotal_cents: Math.round(subtotal * 100),
    vat_total_cents: Math.round(vatTotal * 100),
    irpf_total_cents: Math.round(irpfTotal * 100),
    total_cents: Math.round(total * 100),
    qr_code_url: '',
    invoice_hash: '',
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* CABECERA SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>Crear Factura</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Emite una nueva factura verificable (Veri*factu).</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          <InvoiceModalClient factura={previewFactura} empresa={empresa} variant="button" />

          <button 
            type="button" 
            onClick={() => handleSubmit()}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            <span>Guardar Factura</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* BLOQUE 1: DATOS DE FACTURA / FECHAS */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Nº Factura</label>
              <input 
                type="text" 
                value="Automático (al emitir)" 
                disabled 
                className="form-control" 
                style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8, cursor: 'not-allowed', height: '36px', fontSize: '0.85rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fecha Emisión</label>
              <input 
                type="date" 
                value={issuedDate} 
                onChange={(e) => setIssuedDate(e.target.value)} 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fecha Vencimiento</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: DATOS DEL CLIENTE */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Datos del Cliente</h3>
            <select 
              className="form-control" 
              style={{ width: '220px', height: '32px', fontSize: '0.8rem', padding: '0 8px' }} 
              defaultValue=""
              onChange={(e) => handleSelectCustomer(e.target.value)}
            >
              <option value="" disabled>-- Cargar de mi directorio --</option>
              {customerList.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} {cust.tax_id ? `(${cust.tax_id})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div>
              <input 
                type="text" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                placeholder="Nombre / Razón Social" 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <input 
                type="text" 
                value={clientTaxId} 
                onChange={(e) => setClientTaxId(e.target.value)} 
                placeholder="NIF / CIF" 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <input 
                type="email" 
                value={clientEmail} 
                onChange={(e) => setClientEmail(e.target.value)} 
                placeholder="Correo Electrónico" 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <input 
                type="text" 
                value={clientAddress} 
                onChange={(e) => setClientAddress(e.target.value)} 
                placeholder="Dirección Fiscal" 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: CONCEPTOS */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Conceptos</h3>
            <button type="button" className="btn" style={{ fontSize: '0.8rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem' }}>
              + Insertar del Catálogo <i className="fas fa-chevron-down" style={{ fontSize: '0.6rem', marginLeft: '4px' }}></i>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {lines.map((line, index) => {
              const lineSubtotal = (parseFloat(String(line.quantity)) || 0) * (parseFloat(String(line.unit_price)) || 0);
              const lineVatAmount = lineSubtotal * ((parseFloat(String(line.vat_rate)) || globalVat) / 100);
              const lineTotal = lineSubtotal + lineVatAmount;

              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.2fr 1.5fr 1fr 30px', gap: '8px', alignItems: 'center', background: 'var(--bg-color)', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <input 
                      type="text" 
                      value={line.description} 
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)} 
                      placeholder="Descripción del producto/servicio" 
                      className="form-control" 
                      style={{ height: '34px', fontSize: '0.85rem' }}
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
                      style={{ height: '34px', fontSize: '0.85rem' }}
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
                      style={{ height: '34px', fontSize: '0.85rem' }}
                      required 
                    />
                  </div>
                  <div>
                    <select 
                      value={line.vat_rate} 
                      onChange={(e) => handleLineChange(index, 'vat_rate', e.target.value)} 
                      className="form-control"
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0 4px' }}
                    >
                      <option value="21">General (21%)</option>
                      <option value="10">Reducido (10%)</option>
                      <option value="4">Superreducido (4%)</option>
                      <option value="0">Exento (0%)</option>
                    </select>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', paddingRight: '4px', color: 'var(--text-color)' }}>
                    {lineTotal.toFixed(2)} €
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => removeLine(index)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
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
            style={{ background: 'var(--bg-color)', border: '1px dashed var(--border-color)', color: 'var(--text-color)', fontWeight: 600, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            + Añadir Línea Libre
          </button>
        </div>

        {/* BLOQUE 4: IMPUESTOS Y TOTALES (INFERIOR) */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>IVA GENERAL (%)</label>
              <input 
                type="number" 
                value={globalVat} 
                onChange={(e) => setGlobalVat(Number(e.target.value))} 
                className="form-control" 
                style={{ width: '80px', textAlign: 'center', height: '36px', fontSize: '0.85rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>RETENCIÓN IRPF (%)</label>
              <input 
                type="number" 
                value={irpfRate} 
                onChange={(e) => setIrpfRate(Number(e.target.value))} 
                className="form-control" 
                style={{ width: '80px', textAlign: 'center', height: '36px', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Base Imponible:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{subtotal.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>IVA Repercutido:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>+{vatTotal.toFixed(2)} €</span>
            </div>
            {irpfTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444' }}>
                <span>Retención IRPF:</span>
                <span style={{ fontWeight: 600 }}>-{irpfTotal.toFixed(2)} €</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '6px', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-color)', marginTop: '2px' }}>
              <span>Total Final:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
}