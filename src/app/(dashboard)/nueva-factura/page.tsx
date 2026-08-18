'use client';
import { showToast } from '@/lib/utils/toast';
import { useState, useEffect } from 'react';
import { emitInvoiceAction } from '@/actions/invoice.actions';
import { useRouter } from 'next/navigation';
import InvoicePDFTemplate from '@/components/invoicePDFTemplate';

export default function NuevaFacturaPage() {
  const router = useRouter();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vencimiento, setVencimiento] = useState('');
  
  const [cliente, setCliente] = useState({ nombre: '', nif: '', email: '', direccion: '' });
  const [guardarCliente, setGuardarCliente] = useState(true); 

  const [ivaGlobal, setIvaGlobal] = useState(21);
  
  // NUEVO: Añadimos 'guardarCatalogo: false' al estado inicial de cada concepto
  const [conceptos, setConceptos] = useState([
    { id: 1, descripcion: '', cantidad: 1, precio: 0, tipoIva: 'general', ivaManual: 21, guardarCatalogo: false }
  ]);
  
  const [irpf, setIrpf] = useState(0);
  const [totales, setTotales] = useState({ subtotal: 0, totalIva: 0, totalIrpf: 0, total: 0 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let subtotalCalculado = 0;
    let ivaCalculado = 0;

    conceptos.forEach(c => {
      const baseLinea = (c.cantidad || 0) * (c.precio || 0);
      const ivaAplicar = c.tipoIva === 'general' ? ivaGlobal : c.ivaManual;
      
      subtotalCalculado += baseLinea;
      ivaCalculado += baseLinea * ((ivaAplicar || 0) / 100);
    });

    const irpfCalculado = subtotalCalculado * (irpf / 100);
    
    setTotales({
      subtotal: subtotalCalculado,
      totalIva: ivaCalculado,
      totalIrpf: irpfCalculado,
      total: subtotalCalculado + ivaCalculado - irpfCalculado
    });
  }, [conceptos, ivaGlobal, irpf]);

  const addConceptRow = () => {
    // NUEVO: Las nuevas líneas también nacen con guardarCatalogo en false
    setConceptos([...conceptos, { id: Date.now(), descripcion: '', cantidad: 1, precio: 0, tipoIva: 'general', ivaManual: 21, guardarCatalogo: false }]);
  };

  const removeConceptRow = (idToRemove: number) => {
    if (conceptos.length > 1) {
      setConceptos(conceptos.filter(c => c.id !== idToRemove));
    }
  };

  const updateConcept = (id: number, field: string, value: string | number | boolean) => {
    setConceptos(conceptos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleGuardarFactura = async () => {
    if (!cliente.nombre || !fecha) {
      showToast.error("Campos incompletos", "Por favor, rellena al menos la fecha y el nombre del cliente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("companyId", "3d8febcd-526c-4424-93f8-d8e61b6ee0df");
      payload.append("seriesCode", "F");
      payload.append("customerId", "");
      payload.append("issuedAt", new Date(fecha).toISOString());
      payload.append("dueDate", (vencimiento ? new Date(vencimiento) : new Date(fecha)).toISOString());
      payload.append("saveCustomer", guardarCliente.toString());
      payload.append("customerData", JSON.stringify(cliente));
      payload.append("lines", JSON.stringify(conceptos.map(c => ({
        description: c.descripcion || "Concepto sin descripción",
        quantity: c.cantidad || 1,
        unitPriceCents: Math.round((c.precio || 0) * 100),
        vatPercent: c.tipoIva === 'general' ? ivaGlobal : c.ivaManual,
        saveToCatalog: c.guardarCatalogo
      }))));

      console.log("Enviando payload a Veri*factu...", payload);

      // Usamos el showToast.promise para gestionar la carga, éxito y error de forma fluida
      await showToast.promise(emitInvoiceAction(payload), {
        loading: 'Generando y firmando factura con Veri*factu...',
        success: (result: any) => {
          // Redirigimos al usuario al dashboard o al historial tras el éxito
          router.push('/dashboard');
          return `¡Factura ${result.invoice.formatted_number} emitida con éxito!`;
        },
        error: (err: any) => `Error al emitir la factura: ${err.message}`
      });

    } catch (error: any) {
      console.error("Error al emitir factura:", error);
      // El showToast.promise ya gestiona el error automáticamente, 
      // pero dejamos el catch por seguridad si ocurre algo previo.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Crear Factura</h2>
          <p>Emite una nueva factura verificable (Veri*factu).</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => setShowPreview(true)} 
            disabled={isSubmitting}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: isSubmitting ? 'not-allowed' : 'pointer', 
              color: 'var(--primary)', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              opacity: isSubmitting ? 0.5 : 1
            }} 
          >
            <i className="fas fa-eye"></i> Vista Previa
          </button>
          <button onClick={handleGuardarFactura} className="btn btn-primary" style={{ width: 'auto' }} disabled={isSubmitting}>
            {isSubmitting ? 'Emitiendo...' : 'Guardar Factura'}
          </button>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* FECHAS Y NÚMERO */}
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nº Factura</label>
            <input type="text" className="form-control" value="Automático (al emitir)" readOnly style={{ cursor: 'not-allowed', backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha Emisión</label>
            <input 
              type="date" 
              className="form-control" 
              value={fecha} 
              readOnly 
              style={{ cursor: 'not-allowed', backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha Vencimiento</label>
            <input 
              type="date" 
              className="form-control"
              min={fecha}
              value={vencimiento} 
              onChange={(e) => setVencimiento(e.target.value)} />
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Datos del Cliente</h3>
            <select className="form-control" style={{ width: 'auto', padding: '5px' }}>
              <option value="">-- Cargar de mi directorio --</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="text" placeholder="Nombre / Razón Social" className="form-control" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="text" placeholder="NIF / CIF" className="form-control" value={cliente.nif} onChange={(e) => setCliente({ ...cliente, nif: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="email" placeholder="Correo Electrónico" className="form-control" value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="text" placeholder="Dirección Fiscal" className="form-control" value={cliente.direccion} onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })} />
            </div>
          </div>
        </div>

        {/* CONCEPTOS */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Conceptos</h3>
            <select className="form-control" style={{ width: 'auto', padding: '5px' }}>
              <option value="">+ Insertar del Catálogo</option>
            </select>
          </div>
          
          <div id="items-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {conceptos.map((concepto) => (
              <div key={concepto.id} className="concept-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', margin: 0 }}>
                
                {/* NUEVO: Campo de descripción con el botón de "Guardar en catálogo" incrustado */}
                <div style={{ display: 'flex', flex: '1 1 200px', alignItems: 'center', position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control c-desc" 
                    style={{ width: '100%', paddingRight: '40px' }} 
                    placeholder="Descripción del producto/servicio" 
                    value={concepto.descripcion} 
                    onChange={(e) => updateConcept(concepto.id, 'descripcion', e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={() => updateConcept(concepto.id, 'guardarCatalogo', !concepto.guardarCatalogo)}
                    title={concepto.guardarCatalogo ? "Se guardará en el catálogo" : "Guardar en catálogo"}
                    style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: concepto.guardarCatalogo ? 'var(--primary)' : '#cbd5e1', 
                      fontSize: '1.2rem',
                      transition: 'color 0.2s',
                      padding: 0
                    }}
                  >
                    <i className="fas fa-save"></i>
                  </button>
                </div>

                <input type="number" className="form-control c-cant" style={{ width: '80px', textAlign: 'center' }} min="1" value={concepto.cantidad} onChange={(e) => updateConcept(concepto.id, 'cantidad', parseFloat(e.target.value) || 0)} />
                <input type="number" step="0.01" className="form-control c-precio" style={{ width: '120px', textAlign: 'right' }} placeholder="Precio" value={concepto.precio || ''} onChange={(e) => updateConcept(concepto.id, 'precio', parseFloat(e.target.value) || 0)} />
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select 
                    className="form-control c-iva" 
                    style={{ width: concepto.tipoIva === 'general' ? '140px' : '100px' }} 
                    value={concepto.tipoIva} 
                    onChange={(e) => updateConcept(concepto.id, 'tipoIva', e.target.value)}
                  >
                    <option value="general">General ({ivaGlobal}%)</option>
                    <option value="manual">Manual...</option>
                  </select>
                  
                  {concepto.tipoIva === 'manual' && (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ width: '80px', paddingRight: '22px', textAlign: 'right' }} 
                        value={concepto.ivaManual} 
                        onChange={(e) => updateConcept(concepto.id, 'ivaManual', parseFloat(e.target.value) || 0)}
                      />
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
                    </div>
                  )}
                </div>

                <div className="c-total" style={{ width: '90px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)', marginLeft: 'auto' }}>
                  {((concepto.cantidad || 0) * (concepto.precio || 0)).toFixed(2)} €
                </div>
                <button type="button" onClick={() => removeConceptRow(concepto.id)} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '1rem', cursor: 'pointer', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
          
          <button type="button" onClick={addConceptRow} className="btn" style={{ marginTop: '1.5rem', width: 'auto', background: 'transparent', color: 'var(--primary)', border: '2px dashed var(--primary)' }}>
            <i className="fas fa-plus"></i> Añadir Línea Libre
          </button>
        </div>

        {/* TOTALES E IMPUESTOS */}
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>IVA General (%)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: '120px', paddingRight: '25px' }} 
                  value={ivaGlobal} 
                  onChange={(e) => setIvaGlobal(parseFloat(e.target.value) || 0)} 
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Retención IRPF (%)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: '120px', paddingRight: '25px' }} 
                  value={irpf} 
                  onChange={(e) => setIrpf(parseFloat(e.target.value) || 0)} 
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
          </div>
          
          <div className="totales-caja" style={{ minWidth: '250px' }}>
            <div className="totales-linea"><span>Base Imponible:</span><span>{totales.subtotal.toFixed(2)} €</span></div>
            <div className="totales-linea"><span>IVA Repercutido:</span><span>+{totales.totalIva.toFixed(2)} €</span></div>
            {irpf > 0 && <div className="totales-linea"><span>Retención IRPF:</span><span>-{totales.totalIrpf.toFixed(2)} €</span></div>}
            <div className="totales-linea total-final" style={{ borderTop: '2px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem', fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>
              <span>Total Final:</span><span>{totales.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </form>

      {/* --- MODAL DE VISTA PREVIA (ESTILO HISTORIAL) --- */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647, backgroundColor: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1rem 2rem', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Vista Previa: Borrador de Factura</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button onClick={() => setShowPreview(false)} style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                Seguir Editando
              </button>
              <button onClick={() => { setShowPreview(false); handleGuardarFactura(); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600 }}>
                <i className="fas fa-paper-plane"></i> Emitir Factura
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ width: '100%', maxWidth: '900px', pointerEvents: 'none' }}>
<InvoicePDFTemplate 
                factura={{
                  id: 'preview',
                  formatted_number: 'BORRADOR',
                  issued_at: fecha,
                  
                  client_name: cliente.nombre || 'Cliente General',
                  client_tax_id: cliente.nif || '-',
                  client_address: cliente.direccion || '-',

                  // Totales generales en céntimos (incluyendo IRPF)
                  subtotal_cents: Math.round(totales.subtotal * 100),
                  vat_total_cents: Math.round(totales.totalIva * 100),
                  irpf_total_cents: Math.round(totales.totalIrpf * 100), // NUEVO
                  total_cents: Math.round(totales.total * 100),

                  lines: conceptos.map(c => {
                    const cant = c.cantidad || 1;
                    const prec = c.precio || 0;
                    const tot = cant * prec;

                    return {
                      description: c.descripcion || '-',
                      quantity: cant,
                      unit_price_cents: Math.round(prec * 100),
                      total_amount_cents: Math.round(tot * 100)
                    };
                  })
                }} 
                empresa={{ 
                  name: "Tu Empresa S.L.",
                  tax_id: "B12345678",
                  address: "Calle Principal 123, Madrid"
                }} 
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}