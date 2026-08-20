'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { descargarFacturaPDF, generarFacturaBase64PDF } from '@/lib/pdf/pdf';
import InvoicePDFTemplate from '@/components/invoicePDFTemplate';
import { sendInvoiceByEmailAction } from '@/actions/email.actions';
import { showToast } from '@/lib/utils/toast';

export default function InvoiceModalClient({ 
  factura, 
  empresa,
  settings, 
  variant = 'icon',
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSave,
  saving = false
}: { 
  factura: any; 
  empresa: any; 
  settings?: any;
  variant?: 'icon' | 'preview-only' | 'confirm-emit';
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showRectifyConfirm, setShowRectifyConfirm] = useState(false);
  const [rectifyReason, setRectifyReason] = useState('R1 - Error en factura previa / rectificación de importes');
  const [mounted, setMounted] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const showModal = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  const handleDownload = () => {
    const element = document.getElementById(`printable-invoice-${factura.id || 'preview'}`);
    if (element) {
      descargarFacturaPDF(element, factura.formatted_number || 'Factura-Borrador');
    }
  };

  const handleEnviarEmail = async () => {
    const recipientEmail = factura.client_email;
    if (!recipientEmail || !recipientEmail.trim()) {
      showToast.error('El cliente no tiene un correo electrónico asociado.');
      return;
    }

    setSendingEmail(true);

    try {
      const element = document.getElementById(`printable-invoice-${factura.id || 'preview'}`);
      let pdfBase64: string | undefined = undefined;
      
      if (element) {
        const base64 = await generarFacturaBase64PDF(element);
        if (base64) pdfBase64 = base64;
      }

      const totalEur = ((factura.total_cents || 0) / 100).toFixed(2);
      
      const res = await sendInvoiceByEmailAction({
        to: recipientEmail,
        clientName: factura.client_name || 'Cliente',
        invoiceNumber: factura.formatted_number,
        totalEur,
        companyName: empresa?.name || 'Facturify',
        companyEmail: empresa?.email,
        pdfBase64,
      });

      if (res.success) {
        showToast.success(`Factura con PDF adjunto enviada a ${recipientEmail}`);
      } else {
        showToast.error(res.error || 'Error al enviar el email');
      }
    } catch (err: any) {
      showToast.error(err.message || 'Error inesperado al enviar el correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExecuteRectify = () => {
    const rectificationData = {
      rectifiesInvoiceId: factura.id,
      rectifiesNumber: factura.formatted_number,
      rectificationReason: rectifyReason,
      clientName: factura.client_name || '',
      clientTaxId: factura.client_tax_id || '',
      clientEmail: factura.client_email || '',
      clientAddress: factura.client_address || '',
      lines: (factura.lines || []).map((l: any) => ({
        description: `Abono: ${l.description || 'Concepto'} (Rectifica a ${factura.formatted_number})`,
        quantity: l.quantity ? -Math.abs(parseFloat(l.quantity)) : -1,
        unit_price: l.unit_price_cents ? (l.unit_price_cents / 100) : 0,
        vat_rate: l.vat_percent || 21,
        saved: true,
      })),
    };

    sessionStorage.setItem('facturify_rectification_data', JSON.stringify(rectificationData));
    setShowRectifyConfirm(false);
    handleClose();
    router.push('/nueva-factura?mode=rectification');
  };

  const handleConfirmSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const isAlreadyRectification = factura.formatted_number?.startsWith('R-') || factura.series_code === 'R';

  const modalContent = showModal ? (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      zIndex: 2147483647, backgroundColor: '#e2e8f0', display: 'flex', flexDirection: 'column' 
    }}>
      {/* Cabecera del visor */}
      <div style={{ 
        backgroundColor: 'white', padding: '1rem 2rem', borderBottom: '1px solid #cbd5e1', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
            {variant === 'confirm-emit' 
              ? 'Revisión Previa a la Emisión' 
              : (variant === 'preview-only' ? 'Vista Previa del Borrador' : `Factura: ${factura.formatted_number}`)}
          </h3>
          {variant === 'confirm-emit' && (
            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
              Revisa los datos fiscales. Al confirmar se registrará de forma inmutable en Veri*factu.
            </span>
          )}
        </div>
        
        {/* Botoneras */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {variant === 'confirm-emit' && (
            <>
              <button 
                type="button"
                onClick={handleClose} 
                disabled={saving}
                style={{ 
                  background: 'transparent', 
                  color: '#475569', 
                  border: '1px solid #cbd5e1', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center', 
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                <i className="fas fa-edit"></i> Seguir Editando
              </button>

              <button 
                type="button"
                onClick={handleConfirmSave} 
                disabled={saving}
                style={{ 
                  background: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 18px', 
                  borderRadius: '6px', 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center', 
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
                }}
              >
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                <span>{saving ? 'Emitiendo y Enviando...' : 'Confirmar y Emitir Factura'}</span>
              </button>
            </>
          )}

          {variant === 'preview-only' && (
            <button 
              type="button"
              onClick={handleClose} 
              className="btn"
              style={{ 
                background: 'var(--bg-color)', 
                color: 'var(--text-color)', 
                border: '1px solid var(--border-color)', 
                padding: '8px 14px', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              Volver al Borrador
            </button>
          )}

          {variant === 'icon' && (
            <>
              {!isAlreadyRectification && (
                <button 
                  type="button"
                  onClick={() => setShowRectifyConfirm(true)} 
                  style={{ 
                    background: '#fef2f2', 
                    color: '#dc2626', 
                    border: '1px solid #fca5a5', 
                    padding: '8px 14px', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    gap: '6px', 
                    alignItems: 'center', 
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                  title="Emitir Factura Rectificativa / Abono vinculada"
                >
                  <i className="fas fa-undo"></i> Rectificar
                </button>
              )}

              <button 
                type="button"
                onClick={handleEnviarEmail}
                disabled={sendingEmail}
                style={{ 
                  background: 'transparent', 
                  color: '#0f172a', 
                  border: '1px solid #cbd5e1', 
                  padding: '8px 14px', 
                  borderRadius: '6px', 
                  cursor: sendingEmail ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  gap: '6px', 
                  alignItems: 'center', 
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {sendingEmail ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-envelope"></i>}
                <span>{sendingEmail ? 'Enviando...' : 'Enviar Email'}</span>
              </button>

              <button 
                type="button"
                onClick={handleDownload} 
                style={{ 
                  background: '#0f172a', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 14px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  gap: '6px', 
                  alignItems: 'center', 
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <i className="fas fa-download"></i> Descargar PDF
              </button>
            </>
          )}

          <button 
            type="button"
            onClick={handleClose} 
            disabled={saving || sendingEmail}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '2.2rem', 
              cursor: 'pointer', 
              color: '#64748b', 
              marginLeft: '6px', 
              lineHeight: '1rem', 
              padding: '0 5px' 
            }} 
            title="Cerrar visor"
          >
            &times;
          </button>
        </div>
      </div>
      
      {/* Contenedor del documento */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <InvoicePDFTemplate factura={factura} empresa={empresa} settings={settings} />
        </div>
      </div>

      {/* POPUP MODAL PARA CONFIRMAR RECTIFICACIÓN */}
      {showRectifyConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                  Emitir Factura Rectificativa
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Abono vinculado a la factura <strong>{factura.formatted_number}</strong>
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Motivo de la rectificación (Código AEAT)
              </label>
              <select
                value={rectifyReason}
                onChange={(e) => setRectifyReason(e.target.value)}
                className="form-control"
                style={{ width: '100%', height: '45px', fontSize: '0.85rem' }}
              >
                <option value="R1 - Error fundado en derecho">
                  R1 - Error fundado en derecho / importes
                </option>
                <option value="R4 - Devolución de mercancías o rescisión">
                  R4 - Devolución o anulación de operación
                </option>
                <option value="R2 - Concurso de acreedores">
                  R2 - Concurso de acreedores
                </option>
                <option value="R3 - Crédito incobrable">
                  R3 - Crédito incobrable judicial
                </option>
              </select>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.35' }}>
              Se abrirá el editor con la <strong>Serie R</strong> asignada y los conceptos en negativo para emitir el abono reglamentario.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowRectifyConfirm(false)}
                className="btn"
                style={{
                  background: 'var(--bg-color)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRectify}
                className="btn"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-check"></i>
                <span>Proceder al Abono</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {variant === 'icon' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setInternalIsOpen(true)} 
            title="Ver Factura y PDF" 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '1.1rem' }}
          >
            <i className="fas fa-eye"></i>
          </button>
          {factura.qr_code_url && (
            <a 
              href={factura.qr_code_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Ver Código QR Veri*factu" 
              style={{ color: 'var(--text-muted)', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center' }}
            >
              <i className="fas fa-qrcode"></i>
            </a>
          )}
        </div>
      )}

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}