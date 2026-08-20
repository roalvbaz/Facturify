'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { emitInvoiceAction, getActiveCompanyAction, getCompanyCustomersAction } from '@/actions/invoice.actions';
import { createProductAction } from '@/actions/product.actions';
import { showToast } from '@/lib/utils/toast';
import { generarFacturaBase64PDF } from '@/lib/pdf/pdf';
import InvoiceModalClient from '@/components/invoiceModalClient';
import { ProductCatalogSelector } from '@/components/productCatalogSelector';
import { CustomerSelector } from '@/components/customerSelector';
import { PackagePlus, Users, RotateCcw, Eye, CheckCircle } from 'lucide-react';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmReviewOpen, setIsConfirmReviewOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [empresa, setEmpresa] = useState<{ id?: string; name: string; nif: string; address: string }>({
    name: 'Cargando empresa...', nif: '', address: '',
  });

  const [customerList, setCustomerList] = useState<Array<any>>([]);

  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerInputRef = useRef<HTMLDivElement>(null);

  const [seriesCode, setSeriesCode] = useState('F');
  const [rectifiesInvoiceId, setRectifiesInvoiceId] = useState<string | null>(null);
  const [rectificationReason, setRectificationReason] = useState('');
  const [rectifiesNumber, setRectifiesNumber] = useState('');

  const [issuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  
  const [clientName, setClientName] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [globalVat, setGlobalVat] = useState(21);
  const [irpfRate, setIrpfRate] = useState(0);

  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 21, saved: false }
  ]);

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
        if (custRes?.customers) setCustomerList(custRes.customers);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    }
    loadData();

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'rectification') {
      const rawData = sessionStorage.getItem('facturify_rectification_data');
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          setSeriesCode('R');
          setRectifiesInvoiceId(data.rectifiesInvoiceId);
          setRectificationReason(data.rectificationReason);
          setRectifiesNumber(data.rectifiesNumber);
          setClientName(data.clientName);
          setClientTaxId(data.clientTaxId);
          setClientEmail(data.clientEmail);
          setClientAddress(data.clientAddress);
          if (data.lines && data.lines.length > 0) {
            setLines(data.lines);
          }
          showToast.info(`Emitiendo Factura Rectificativa para ${data.rectifiesNumber}`);
          sessionStorage.removeItem('facturify_rectification_data');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerInputRef.current && !customerInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerInputChange = (value: string) => {
    setClientName(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = customerList.filter(
      (c) =>
        c.name?.toLowerCase().includes(value.toLowerCase()) ||
        c.tax_id?.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelectCustomer = (selected: any) => {
    setClientName(selected.name || '');
    setClientTaxId(selected.tax_id || '');
    setClientEmail(selected.email || '');
    setClientAddress(selected.address || '');
    setShowSuggestions(false);
    showToast.success(`Cliente ${selected.name} cargado`);
  };

  const handleClearCustomer = () => {
    setClientName('');
    setClientTaxId('');
    setClientEmail('');
    setClientAddress('');
    setSuggestions([]);
    setShowSuggestions(false);
    showToast.info('Datos del cliente limpiados');
  };

  const handleSelectProductFromCatalog = (product: any) => {
    setLines((prev) => {
      if (prev.length === 1 && !prev[0].description.trim() && Number(prev[0].unit_price) === 0) {
        return [{
            description: product.description || product.name,
            quantity: 1,
            unit_price: product.unitPrice || product.price || 0,
            vat_rate: product.vatPercent || product.default_vat || 21,
            saved: true, 
          }];
      }
      return [...prev, {
          description: product.description || product.name,
          quantity: 1,
          unit_price: product.unitPrice || product.price || 0,
          vat_rate: product.vatPercent || product.default_vat || 21,
          saved: true, 
        }];
    });
    showToast.success('Concepto insertado desde el catálogo');
  };

  const handleQuickSaveProduct = async (index: number) => {
    const line = lines[index];
    if (!line.description) return;

    const formData = new FormData();
    formData.append("name", line.description);
    formData.append("price", String(line.unit_price));
    formData.append("default_vat", String(line.vat_rate));

    const res = await createProductAction(formData);
    if (res.success) {
      showToast.success("Concepto guardado en el catálogo");
      const newLines = [...lines];
      newLines[index].saved = true; 
      setLines(newLines);
    } else {
      showToast.error(res.error || "Error al guardar en catálogo");
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'description' || field === 'unit_price') {
      newLines[index].saved = false;
    }
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, vat_rate: globalVat, saved: false }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) {
      setLines([{ description: '', quantity: 1, unit_price: 0, vat_rate: globalVat, saved: false }]);
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, l) => acc + (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0), 0);
  const vatTotal = lines.reduce((acc, l) => {
    const lineSub = (parseFloat(String(l.quantity)) || 0) * (parseFloat(String(l.unit_price)) || 0);
    const vatRate = parseFloat(String(l.vat_rate)) || globalVat;
    return acc + (lineSub * (vatRate / 100));
  }, 0);
  const irpfTotal = subtotal * (parseFloat(String(irpfRate)) / 100);
  const total = subtotal + vatTotal - irpfTotal;

  const validateForm = () => {
    if (!dueDate || !dueDate.trim()) {
      showToast.error('Debes indicar la Fecha de Vencimiento.');
      return false;
    }
    if (!clientName.trim()) {
      showToast.error('Debes indicar el Nombre o Razón Social del cliente.');
      return false;
    }
    if (!clientTaxId.trim()) {
      showToast.error('Debes indicar el NIF / CIF del cliente.');
      return false;
    }
    if (!clientEmail.trim()) {
      showToast.error('Debes indicar el Correo Electrónico del cliente.');
      return false;
    }
    if (lines.length === 0) {
      showToast.error('La factura debe tener al menos una línea de concepto.');
      return false;
    }

    const lineaInvalida = lines.find(
      (l) => !l.description || !l.description.trim() || Number(l.quantity) === 0
    );
    if (lineaInvalida) {
      showToast.error('Todas las líneas deben tener una descripción y una cantidad válida distinta de 0.');
      return false;
    }

    return true;
  };

  const handleStartSaveFlow = () => {
    if (validateForm()) {
      setIsConfirmReviewOpen(true);
    }
  };

  const handleFinalEmit = async () => {
    setLoading(true);

    try {
      const element = document.getElementById('printable-invoice-preview-id');
      let pdfBase64: string | undefined = undefined;

      if (element) {
        const base64 = await generarFacturaBase64PDF(element);
        if (base64) pdfBase64 = base64;
      }

      const result = await emitInvoiceAction({
        seriesCode,
        issuedDate,
        dueDate,
        paymentMethod,
        irpfRate,
        sendEmail: true,
        pdfBase64,
        rectifiesInvoiceId: rectifiesInvoiceId || undefined,
        rectificationReason: rectificationReason || undefined,
        customerData: {
          nombre: clientName.trim(),
          nif: clientTaxId.trim(),
          email: clientEmail.trim(),
          direccion: clientAddress.trim(),
        },
        lines,
      });

      if (result.success) {
        setIsConfirmReviewOpen(false);
        if (result.emailSent) {
          showToast.success(`Factura emitida y enviada con PDF a ${clientEmail}`);
        } else {
          showToast.success('Factura emitida correctamente');
        }
        router.push('/historial');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Error al emitir la factura');
    } finally {
      setLoading(false);
    }
  };

  const previewFactura = {
    id: 'preview-id',
    formatted_number: `${seriesCode}-2026-XXXX`,
    issued_at: issuedDate || new Date().toISOString(),
    due_date: dueDate || undefined,
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
        vat_percent: vatRate,
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
            {seriesCode === 'R' ? `Factura Rectificativa (${rectifiesNumber})` : 'Crear Factura'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {seriesCode === 'R' ? 'Abono reglamentario encadenado a Veri*factu.' : 'Emite una nueva factura verificable (Veri*factu).'}
          </p>
        </div>
        
        {/* BOTONES SUPERIORES */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setIsPreviewOpen(true)}
            className="btn"
            style={{ 
              background: 'var(--bg-color)', 
              color: 'var(--text-color)', 
              border: '1px solid var(--border-color)', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              padding: '0.4rem 0.9rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer' 
            }}
          >
            <Eye style={{ width: '15px', height: '15px', color: 'var(--primary)' }} />
            <span>Vista Previa</span>
          </button>

          <button 
            type="button" 
            onClick={handleStartSaveFlow}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle style={{ width: '15px', height: '15px' }} />
            <span>{seriesCode === 'R' ? 'Emitir Abono' : 'Guardar y Enviar'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleStartSaveFlow(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* BLOQUE 1: DATOS DE FACTURA, FECHAS Y FORMA DE COBRO */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                {seriesCode === 'R' ? 'Serie Rectificativa' : 'Nº Factura'}
              </label>
              <input 
                type="text" 
                value={seriesCode === 'R' ? 'Serie R (Automático)' : 'Automático (al emitir)'} 
                disabled 
                className="form-control" 
                style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8, cursor: 'not-allowed', height: '42px', fontSize: '0.85rem', color: seriesCode === 'R' ? '#dc2626' : undefined, fontWeight: seriesCode === 'R' ? 700 : undefined }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Fecha Emisión (Hoy)
              </label>
              <input 
                type="text" 
                value={new Date(issuedDate).toLocaleDateString('es-ES')} 
                disabled 
                className="form-control" 
                style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8, cursor: 'not-allowed', height: '42px', fontSize: '0.85rem', fontWeight: 600 }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Fecha Vencimiento *
              </label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="form-control" 
                style={{ height: '42px', fontSize: '0.85rem' }} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Forma de Cobro
              </label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
                className="form-control" 
                style={{ 
                  height: '42px', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  padding: '0 0.75rem',
                  lineHeight: '1.4'
                }}
              >
                <option value="TRANSFERENCIA">Transferencia (Pendiente)</option>
                <option value="TARJETA">Tarjeta / TPV (Pagada)</option>
                <option value="EFECTIVO">Efectivo (Pagada)</option>
                <option value="BIZUM">Bizum Directo (Pagada)</option>
                <option value="DOMICILIACION">Giro Bancario (Pendiente)</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: DATOS DEL CLIENTE */}
        <div className="card" style={{ padding: '1rem 1.25rem', overflow: 'visible' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Datos del Cliente</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Escribe para autocompletar o selecciona desde tu directorio.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={handleClearCustomer}
                className="btn" 
                style={{ 
                  fontSize: '0.8rem', 
                  backgroundColor: '#fee2e2', 
                  color: '#dc2626', 
                  border: '1px solid #fca5a5', 
                  padding: '0.35rem 0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  borderRadius: '6px'
                }}
              >
                <RotateCcw style={{ width: '13px', height: '13px' }} />
                <span>Limpiar Cliente</span>
              </button>

              <button 
                type="button" 
                onClick={() => setIsCustomerModalOpen(true)}
                className="btn" 
                style={{ 
                  fontSize: '0.8rem', 
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.35rem 0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Users style={{ width: '14px', height: '14px' }} />
                <span>Directorio Completo</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div ref={customerInputRef} style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={clientName} 
                onChange={(e) => handleCustomerInputChange(e.target.value)}
                onFocus={() => clientName.trim() && setSuggestions(customerList.filter(c => c.name?.toLowerCase().includes(clientName.toLowerCase())))}
                placeholder="Nombre / Razón Social *" 
                className="form-control" 
                style={{ height: '36px', fontSize: '0.85rem' }} 
                required 
                autoComplete="off"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    zIndex: 50,
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-color)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.tax_id ? `NIF: ${c.tax_id}` : 'Sin NIF'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <input type="text" value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} placeholder="NIF / CIF *" className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} required />
            </div>
            <div>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Correo Electrónico *" className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} required />
            </div>
            <div>
              <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Dirección Fiscal" className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: CONCEPTOS */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Conceptos</h3>
            <button 
              type="button" 
              onClick={() => setIsCatalogOpen(true)}
              className="btn" 
              style={{ fontSize: '0.8rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <PackagePlus style={{ width: '14px', height: '14px' }} />
              <span>+ Insertar del Catálogo</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {lines.map((line, index) => {
              const lineSubtotal = (parseFloat(String(line.quantity)) || 0) * (parseFloat(String(line.unit_price)) || 0);
              const lineVatAmount = lineSubtotal * ((parseFloat(String(line.vat_rate)) || globalVat) / 100);
              const lineTotal = lineSubtotal + lineVatAmount;

              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.2fr 1.5fr 1fr 60px', gap: '8px', alignItems: 'center', background: 'var(--bg-color)', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <input type="text" value={line.description} onChange={(e) => handleLineChange(index, 'description', e.target.value)} placeholder="Descripción del producto/servicio" className="form-control" style={{ height: '34px', fontSize: '0.85rem' }} required />
                  </div>
                  <div>
                    <input type="number" step="any" value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} className="form-control" style={{ height: '34px', fontSize: '0.85rem' }} required />
                  </div>
                  <div>
                    <input type="number" step="0.01" value={line.unit_price} onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)} placeholder="Precio" className="form-control" style={{ height: '34px', fontSize: '0.85rem' }} required />
                  </div>
                  <div>
                    <select value={line.vat_rate} onChange={(e) => handleLineChange(index, 'vat_rate', e.target.value)} className="form-control" style={{ height: '34px', fontSize: '0.8rem', padding: '0 4px' }}>
                      <option value="21">General (21%)</option>
                      <option value="10">Reducido (10%)</option>
                      <option value="4">Superreducido (4%)</option>
                      <option value="0">Exento (0%)</option>
                    </select>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', paddingRight: '4px', color: 'var(--text-color)' }}>
                    {lineTotal.toFixed(2)} €
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                    {!line.saved && line.description.trim() !== '' && (
                      <button type="button" onClick={() => handleQuickSaveProduct(index)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '1.1rem' }} title="Guardar este concepto en el catálogo">
                        <i className="fas fa-save"></i>
                      </button>
                    )}
                    <button type="button" onClick={() => removeLine(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }} title="Vaciar/Eliminar línea">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addLine} className="btn" style={{ background: 'var(--bg-color)', border: '1px dashed var(--border-color)', color: 'var(--text-color)', fontWeight: 600, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            + Añadir Línea Libre
          </button>
        </div>

        {/* BLOQUE 4: IMPUESTOS Y TOTALES */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                IVA GENERAL (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                value={globalVat} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGlobalVat(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
                }} 
                className="form-control" 
                style={{ width: '80px', textAlign: 'center', height: '36px', fontSize: '0.85rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                RETENCIÓN IRPF (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                value={irpfRate} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIrpfRate(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
                }} 
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

      {/* 1. VISOR DE VISTA PREVIA (Solo consulta) */}
      <InvoiceModalClient
        factura={previewFactura}
        empresa={empresa}
        variant="preview-only"
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* 2. VISOR DE REVISIÓN Y CONFIRMACIÓN OBLIGATORIA */}
      <InvoiceModalClient
        factura={previewFactura}
        empresa={empresa}
        variant="confirm-emit"
        isOpen={isConfirmReviewOpen}
        onClose={() => setIsConfirmReviewOpen(false)}
        onSave={handleFinalEmit}
        saving={loading}
      />

      {/* MODALES DE CATÁLOGO Y CLIENTES */}
      <ProductCatalogSelector
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectProduct={handleSelectProductFromCatalog}
      />

      <CustomerSelector
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customerList}
        onSelectCustomer={handleSelectCustomer}
      />

    </div>
  );
}