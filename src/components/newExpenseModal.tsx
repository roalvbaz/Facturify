'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createExpenseAction } from '@/actions/expense.actions';
import { showToast } from '@/lib/utils/toast';

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '48px',
  height: '48px',
  lineHeight: '48px',
  fontSize: '0.95rem',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1px solid var(--border-color, #cbd5e1)',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  boxSizing: 'border-box',
  outline: 'none',
  display: 'block',
};

export default function NewExpenseModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subtotal, setSubtotal] = useState<number | string>('');
  const [vatPercent, setVatPercent] = useState(21);
  const [irpfPercent, setIrpfPercent] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const numSubtotal = parseFloat(String(subtotal)) || 0;
  const vatAmount = numSubtotal * (vatPercent / 100);
  const irpfAmount = numSubtotal * (irpfPercent / 100);
  const total = numSubtotal + vatAmount - irpfAmount;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('vat_percent', String(vatPercent));
      formData.set('irpf_percent', String(irpfPercent));

      const res = await createExpenseAction(formData);
      if (res.success) {
        showToast.success('Gasto registrado correctamente');
        onClose();
      } else {
        showToast.error(res.error || 'Error al guardar el gasto');
      }
    } catch (err: any) {
      showToast.error(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* CABECERA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
              Registrar Gasto / Compra
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Introduce los datos fiscales y desglosa el IVA soportado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.8rem',
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: '1',
              padding: '0 6px',
            }}
          >
            &times;
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO CON SCROLL */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
          }}
        >
          {/* PROVEEDOR Y NIF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Proveedor / Comercio *
              </label>
              <input
                type="text"
                name="supplier_name"
                placeholder="Ej: AWS, Adobe, Vodafone..."
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                NIF / CIF Proveedor
              </label>
              <input
                type="text"
                name="supplier_tax_id"
                placeholder="B12345678"
                style={inputStyle}
              />
            </div>
          </div>

          {/* REF, FECHA Y CATEGORÍA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Nº Factura / Ref
              </label>
              <input
                type="text"
                name="invoice_reference"
                placeholder="FAC-2026/091"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Fecha del Gasto *
              </label>
              <input
                type="date"
                name="expense_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Categoría
              </label>
              <select name="category" style={inputStyle}>
                <option value="Software / SaaS">Software / SaaS</option>
                <option value="Suministros">Suministros</option>
                <option value="Servicios Profesionales">Servicios Profesionales</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Material / Oficina">Material / Oficina</option>
                <option value="Dietas / Viajes">Dietas / Viajes</option>
                <option value="General">Otros Gastos</option>
              </select>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Descripción / Concepto
            </label>
            <input
              type="text"
              name="description"
              placeholder="Ej: Suscripción mensual de servidores"
              style={inputStyle}
            />
          </div>

          {/* BASE, IVA, IRPF */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '1rem',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Base Imponible (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                name="subtotal"
                placeholder="0.00"
                required
                style={{ ...inputStyle, fontWeight: 700, fontSize: '1.05rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                IVA
              </label>
              <select
                value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))}
                style={{ ...inputStyle, fontWeight: 600 }}
              >
                <option value="21">21%</option>
                <option value="10">10%</option>
                <option value="4">4%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                IRPF
              </label>
              <select
                value={irpfPercent}
                onChange={(e) => setIrpfPercent(Number(e.target.value))}
                style={{ ...inputStyle, fontWeight: 600 }}
              >
                <option value="0">0%</option>
                <option value="15">15%</option>
                <option value="19">19%</option>
                <option value="7">7%</option>
              </select>
            </div>
          </div>

          {/* TOTALES */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontSize: '0.95rem',
              gap: '20px',
              color: '#0f172a',
              fontWeight: 700,
            }}
          >
            <span>IVA: +{vatAmount.toFixed(2)} €</span>
            {irpfAmount > 0 && <span style={{ color: '#dc2626' }}>IRPF: -{irpfAmount.toFixed(2)} €</span>}
            <span style={{ fontSize: '1.25rem', color: 'var(--primary, #4f46e5)', fontWeight: 900 }}>
              Total: {total.toFixed(2)} €
            </span>
          </div>

          {/* MÉTODO DE PAGO Y ESTADO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Método de Pago
              </label>
              <select name="payment_method" style={inputStyle}>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="TARJETA">Tarjeta de Empresa</option>
                <option value="DOMICILIACION">Domiciliación Bancaria</option>
                <option value="EFECTIVO">Efectivo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Estado
              </label>
              <select name="status" style={{ ...inputStyle, fontWeight: 600 }}>
                <option value="Pagado">Pagado</option>
                <option value="Pendiente">Pendiente de Pago</option>
              </select>
            </div>
          </div>

          {/* ADJUNTAR TICKET */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Adjuntar Ticket / Factura (PDF o Imagen)
            </label>
            <input
              type="file"
              name="receipt"
              accept="image/*,application/pdf"
              style={{
                ...inputStyle,
                padding: '8px 12px',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* ACCIONES */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--bg-color, #f8fafc)',
                border: '1px solid var(--border-color, #cbd5e1)',
                color: '#334155',
                padding: '0.65rem 1.4rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--primary, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.8rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              {loading ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}