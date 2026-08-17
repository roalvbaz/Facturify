'use client';

import { useState, useEffect } from 'react';
// IMPORTAMOS TU SERVER ACTION AQUÍ
import { emitInvoiceAction } from '@/actions/invoice.actions';
import { useRouter } from 'next/navigation';

export default function NuevaFacturaPage() {
  const router = useRouter();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vencimiento, setVencimiento] = useState('');
  const [cliente, setCliente] = useState({ nombre: '', nif: '', email: '', direccion: '' });
  const [conceptos, setConceptos] = useState([{ id: 1, descripcion: '', cantidad: 1, precio: 0 }]);
  const [iva, setIva] = useState(21);
  const [irpf, setIrpf] = useState(0);
  const [totales, setTotales] = useState({ subtotal: 0, totalIva: 0, totalIrpf: 0, total: 0 });
  
  // Estado para bloquear el botón mientras guarda
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let subtotalCalculado = 0;
    conceptos.forEach(c => {
      subtotalCalculado += (c.cantidad || 0) * (c.precio || 0);
    });

    const ivaCalculado = subtotalCalculado * (iva / 100);
    const irpfCalculado = subtotalCalculado * (irpf / 100);
    
    setTotales({
      subtotal: subtotalCalculado,
      totalIva: ivaCalculado,
      totalIrpf: irpfCalculado,
      total: subtotalCalculado + ivaCalculado - irpfCalculado
    });
  }, [conceptos, iva, irpf]);

  const addConceptRow = () => {
    setConceptos([...conceptos, { id: Date.now(), descripcion: '', cantidad: 1, precio: 0 }]);
  };

  const removeConceptRow = (idToRemove: number) => {
    if (conceptos.length > 1) {
      setConceptos(conceptos.filter(c => c.id !== idToRemove));
    }
  };

  const updateConcept = (id: number, field: string, value: string | number) => {
    setConceptos(conceptos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // --- CONEXIÓN CON TU SERVER ACTION ---
  const handleGuardarFactura = async () => {
    if (!cliente.nombre || !fecha) {
      alert("Por favor, rellena al menos la fecha y el nombre del cliente.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Traducimos los datos del frontend al formato que espera tu Zod Schema
      const payload = {
        companyId: "3d8febcd-526c-4424-93f8-d8e61b6ee0df", // Usamos tu empresa de prueba actual
        seriesCode: "F", // Serie por defecto
        customerId: null, // Todavía no tenemos IDs de clientes
        // Mapeamos los conceptos: de euros a céntimos e inyectamos el IVA global por línea
        lines: conceptos.map(c => ({
          description: c.descripcion || "Concepto sin descripción",
          quantity: c.cantidad || 1,
          unitPriceCents: Math.round((c.precio || 0) * 100),
          vatPercent: iva 
        }))
      };

      console.log("Enviando payload a Veri*factu...", payload);
      
      // 2. Ejecutamos la Server Action
      const result = await emitInvoiceAction(payload);
      
      alert("¡Factura emitida y encadenada criptográficamente con éxito!");
      
      // 3. Redirigimos al dashboard para que el usuario vea la nueva factura en la tabla
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Error al emitir factura:", error);
      alert(`Error al emitir la factura: ${error.message}`);
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
          <button className="btn" style={{ background: 'var(--border-color)', color: 'var(--text-main)', width: 'auto' }} disabled={isSubmitting}>
            Vista Previa
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
            <input type="date" className="form-control" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
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
                <input type="text" className="form-control c-desc" style={{ flex: '1 1 250px' }} placeholder="Descripción" value={concepto.descripcion} onChange={(e) => updateConcept(concepto.id, 'descripcion', e.target.value)} />
                <input type="number" className="form-control c-cant" style={{ width: '80px', textAlign: 'center' }} min="1" value={concepto.cantidad} onChange={(e) => updateConcept(concepto.id, 'cantidad', parseFloat(e.target.value) || 0)} />
                <input type="number" step="0.01" className="form-control c-precio" style={{ width: '120px', textAlign: 'right' }} placeholder="Precio" value={concepto.precio || ''} onChange={(e) => updateConcept(concepto.id, 'precio', parseFloat(e.target.value) || 0)} />
                <div className="c-total" style={{ width: '100px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
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
              <label>IVA (%)</label>
              <input type="number" className="form-control" style={{ width: '100px' }} value={iva} onChange={(e) => setIva(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>IRPF (%)</label>
              <input type="number" className="form-control" style={{ width: '100px' }} value={irpf} onChange={(e) => setIrpf(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          
          <div className="totales-caja" style={{ minWidth: '250px' }}>
            <div className="totales-linea"><span>Base Imponible:</span><span>{totales.subtotal.toFixed(2)} €</span></div>
            <div className="totales-linea"><span>IVA Repercutido:</span><span>+{totales.totalIva.toFixed(2)} €</span></div>
            <div className="totales-linea"><span>Retención IRPF:</span><span>-{totales.totalIrpf.toFixed(2)} €</span></div>
            <div className="totales-linea total-final" style={{ borderTop: '2px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem', fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>
              <span>Total Final:</span><span>{totales.total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}