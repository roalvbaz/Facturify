'use client';

import { useState } from 'react';
import { deleteProductAction } from '@/actions/product.actions';
import { showToast } from '@/lib/utils/toast';

export default function DeleteProductButton({ 
  productId, 
  productName 
}: { 
  productId: string; 
  productName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false); // Estado para nuestro propio modal

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteProductAction(productId);
      if (res.success) {
        showToast.success('Producto eliminado correctamente');
      } else {
        showToast.error(res.error || 'No se pudo eliminar el producto');
      }
    } catch (err: any) {
      showToast.error(err.message || 'Error inesperado al eliminar');
    } finally {
      setLoading(false);
      setShowModal(false); // Cerramos el modal al terminar
    }
  };

  return (
    <>
      {/* Botón de la papelera */}
      <button
        type="button"
        onClick={() => setShowModal(true)} // En lugar de window.confirm, abrimos el modal
        disabled={loading}
        title="Eliminar producto"
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

      {/* Nuestro Modal Custom (superpuesto a todo) */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#ef4444', marginBottom: '1rem' }}></i>
            
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)' }}>
              ¿Eliminar producto?
            </h3>
            
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Estás a punto de eliminar <strong>"{productName}"</strong> de tu catálogo. Esta acción no se puede deshacer.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => setShowModal(false)} 
                className="btn" 
                disabled={loading}
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}
              >
                Cancelar
              </button>
              
              <button 
                onClick={handleDelete} 
                className="btn btn-primary" 
                disabled={loading}
                style={{ background: '#ef4444', borderColor: '#ef4444', padding: '0.5rem 1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                <span>Sí, eliminar</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}