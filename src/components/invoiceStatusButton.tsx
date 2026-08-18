'use client';

import { useState } from 'react';
import { showToast } from '@/lib/utils/toast';
import { toggleInvoiceStatusAction } from '@/actions/invoice.actions';

export default function InvoiceStatusButton({ 
  invoiceId, 
  initialStatus, 
}: { 
  invoiceId: string; 
  initialStatus: string; 
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  // 1. Normalizamos el estado actual
  const currentLower = (status || '').toLowerCase().trim();
  const isPaid = currentLower === 'pagada' || currentLower === 'paid' || currentLower.includes('pagad');

  // 2. Definimos los estilos y textos de forma explícita (adiós a ternarias confusas)
  let backgroundColor = '#fef3c7'; // Amarillo por defecto (Pendiente / Draft)
  let textColor = '#92400e';
  let labelText = 'Pendiente';

  if (isPaid) {
    backgroundColor = '#d1fae5'; // Verde esmeralda si está pagada
    textColor = '#065f46';
    labelText = 'Pagada';
  } else if (currentLower === 'draft') {
    labelText = 'Draft';
  }

  const handleClick = async () => {
    setLoading(true);

    try {
      await showToast.promise(toggleInvoiceStatusAction(invoiceId, status), {
        loading: 'Actualizando estado de la factura...',
        success: (result: any) => {
          // Actualizamos el estado localmente con lo que devuelve el servidor
          setStatus(result.newStatus);
          return `Estado actualizado con éxito`;
        },
        error: (err: any) => `No se pudo actualizar: ${err.message || 'Error desconocido'}`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <span style={{ 
        padding: '0.4rem 0.75rem', 
        borderRadius: '0.375rem', 
        fontSize: '0.7rem', 
        fontWeight: 800, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        backgroundColor: backgroundColor, 
        color: textColor,
        display: 'inline-block'
      }}>
        {labelText}
      </span>
      <button 
        type="button"
        disabled={loading}
        onClick={handleClick}
        title={isPaid ? "Marcar como Pendiente" : "Marcar como Pagada"} 
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isPaid ? '#d97706' : '#059669', fontSize: '1.1rem' }}
      >
        <i className={`fas ${loading ? 'fa-spinner fa-spin' : (isPaid ? 'fa-undo' : 'fa-check-circle')}`}></i>
      </button>
    </div>
  );
}