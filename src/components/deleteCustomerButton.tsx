'use client';

import { useState } from 'react';
import { deleteCustomerAction } from '@/actions/customer.actions';
import { showToast } from '@/lib/utils/toast';

export default function DeleteCustomerButton({ 
  customerId, 
  customerName 
}: { 
  customerId: string; 
  customerName: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(`¿Estás seguro de eliminar a "${customerName}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await deleteCustomerAction(customerId);
      if (res.success) {
        showToast.success('Cliente eliminado correctamente');
      } else {
        showToast.error(res.error || 'No se pudo eliminar el cliente');
      }
    } catch (err: any) {
      showToast.error(err.message || 'Error inesperado al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar cliente"
      style={{
        background: 'none',
        border: 'none',
        color: '#ef4444',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        padding: '6px',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
    </button>
  );
}