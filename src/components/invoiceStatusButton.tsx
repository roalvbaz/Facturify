'use client';

import { useState } from 'react';

export default function InvoiceStatusButton({ invoiceId, initialStatus, onToggle }: { invoiceId: string, initialStatus: string, onToggle: (id: string, newStatus: string) => Promise<void> }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const esPagada = status === 'Pagada';

  const handleClick = async () => {
    const nuevoEstado = esPagada ? 'Pendiente' : 'Pagada';
    setLoading(true);
    try {
      await onToggle(invoiceId, nuevoEstado);
      setStatus(nuevoEstado);
    } catch (e) {
      console.error(e);
      alert('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <span style={{ 
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', 
        backgroundColor: esPagada ? '#d1fae5' : '#fef3c7', color: esPagada ? '#047857' : '#b45309'
      }}>
        {status}
      </span>
      <button 
        type="button"
        disabled={loading}
        onClick={handleClick}
        title={esPagada ? "Marcar como Pendiente" : "Marcar como Pagada"} 
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: esPagada ? 'var(--warning)' : 'var(--success)', fontSize: '1rem' }}
      >
        <i className={`fas ${loading ? 'fa-spinner fa-spin' : (esPagada ? 'fa-undo' : 'fa-check-circle')}`}></i>
      </button>
    </div>
  );
}