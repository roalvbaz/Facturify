'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { resetPasswordAction } from '@/app/actions/auth';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await resetPasswordAction(email);
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.' });
      setEmail('');
    } else {
      setMessage({ type: 'error', text: res.error || 'No se pudo procesar la solicitud. Revisa si el correo es correcto.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Image src="/img/banner.png" alt="FacturON Logo" width={280} height={65} priority style={{ objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Recuperar Contraseña</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Introduce tu correo y te enviaremos un enlace seguro</p>
        </div>

        {message && (
          <div style={{ backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#b91c1c', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
            {message.text}
          </div>
        )}

        {!message || message.type === 'error' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Correo Electrónico</label>
              <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" placeholder="tu@empresa.com" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        ) : null}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
            &larr; Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}