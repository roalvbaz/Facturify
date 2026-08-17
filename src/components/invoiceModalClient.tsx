'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { descargarFacturaPDF } from '@/lib/pdf/pdf';
import InvoicePDFTemplate from '@/components/invoicePDFTemplate';

export default function InvoiceModalClient({ factura, empresa }: { factura: any, empresa: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Asegurarnos de que el document.body está disponible al renderizar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll de la página trasera cuando el visor está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleDownload = () => {
    const element = document.getElementById(`printable-invoice-${factura.id}`);
    if (element) {
      descargarFacturaPDF(element, factura.formatted_number);
    }
  };

  const handleEnviarEmail = () => {
    alert(`Funcionalidad en camino: Envío de la factura ${factura.formatted_number} por correo electrónico.`);
  };

  // Contenido a pantalla completa inyectado vía Portal
  const modalContent = isOpen ? (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 2147483647, // Z-index máximo para aplastar la barra lateral
      backgroundColor: '#e2e8f0', // Fondo gris claro para aislar el PDF
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      
      {/* Barra de herramientas superior del Visor */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1rem 2rem', 
        borderBottom: '1px solid #cbd5e1', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        flexShrink: 0
      }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Factura: {factura.formatted_number}</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleEnviarEmail} style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600 }}>
            <i className="fas fa-envelope"></i> Enviar por Email
          </button>
          <button onClick={handleDownload} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600 }}>
            <i className="fas fa-download"></i> Descargar PDF
          </button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2.5rem', cursor: 'pointer', color: '#64748b', marginLeft: '10px', lineHeight: '1rem', padding: '0 5px' }} title="Cerrar visor">
            &times;
          </button>
        </div>
      </div>
      
      {/* Área del documento PDF (con scroll interno) */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'flex-start' // Asegura que el A4 empiece desde arriba y no se centre verticalmente
      }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <InvoicePDFTemplate factura={factura} empresa={empresa} />
        </div>
      </div>

    </div>
  ) : null;

  return (
    <>
      {/* Botones en la tabla del historial */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={() => setIsOpen(true)} 
          title="Ver Factura y PDF" 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '1.1rem' }}
        >
          <i className="fas fa-eye"></i>
        </button>
        {factura.qr_code_url && (
          <a href={factura.qr_code_url} target="_blank" rel="noopener noreferrer" title="Ver Código QR Veri*factu" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center' }}>
            <i className="fas fa-qrcode"></i>
          </a>
        )}
      </div>

      {/* Inyección del visor directamente en la raíz de la página */}
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}