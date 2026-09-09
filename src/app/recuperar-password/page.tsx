'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { resetPasswordAction } from '@/app/actions/auth';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await resetPasswordAction(email);

    if (res.success) {
      setSentEmail(email);
      setMessage({ type: 'success', text: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.' });
      setEmail('');
    } else {
      setMessage({ type: 'error', text: res.error || 'No se pudo procesar la solicitud. Revisa si el correo es correcto.' });
    }
    setLoading(false);
  };

  return (
    <div className="login-page" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      padding: '2rem',
    }}>
      <div className="rp-card login-card" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem 2rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <Image
            src="/img/banner.png"
            alt="FacturON Logo"
            width={432}
            height={121}
            priority
            style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Icon + Title */}
        {!message || message.type === 'error' ? (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              border: '2px solid #99f6e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 style={{
              fontSize: '1.375rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.01em',
            }}>
              Recuperar Contraseña
            </h1>
            <p style={{
              color: '#64748b',
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Introduce tu correo y te enviaremos un enlace seguro
            </p>
          </div>
        ) : null}

        {/* Error message */}
        {message?.type === 'error' && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.8125rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
            lineHeight: 1.5,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{message.text}</span>
          </div>
        )}

        {/* Success state */}
        {message?.type === 'success' && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              border: '2px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.5rem 0',
            }}>
              ¡Correo Enviado!
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '0.8125rem',
              margin: '0 0 0.25rem',
              lineHeight: 1.6,
            }}>
              {message.text}
            </p>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              margin: '0.75rem 0 0',
            }}>
              Si no lo recibes en unos minutos, revisa tu carpeta de spam.
            </p>

            {/* Botón para ir a introducir el código */}
            <Link
              href={`/actualizar-password?email=${encodeURIComponent(sentEmail || '')}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
                padding: '0.875rem 2rem',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0f766e';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0d9488';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(13, 148, 136, 0.3)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Introducir Código
            </Link>
          </div>
        )}

        {/* Form */}
        {!message || message.type === 'error' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="tu@empresa.com"
                style={{ padding: '0.875rem 1rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary rp-submit-btn"
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="rp-spinner" />
                  Enviando...
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Enviar enlace
                </span>
              )}
            </button>
          </form>
        ) : null}

        {/* Back to login */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
          <Link
            href="/login"
            style={{
              color: '#64748b',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'color 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al Login
          </Link>
        </div>
      </div>

      <style>{`
        .rp-card {
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-md);
          animation: rp-fadeIn 0.4s ease;
        }
        .rp-submit-btn {
          transition: all 0.2s ease;
        }
        .rp-submit-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }
        .rp-submit-btn:not(:disabled):active {
          transform: translateY(0);
        }
        .rp-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: rp-spin 0.6s linear infinite;
        }
        @keyframes rp-fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rp-spin {
          to { transform: rotate(360deg); }
        }
        /* Hover link */
        a:hover { color: #0f172a !important; }
      `}</style>
    </div>
  );
}
