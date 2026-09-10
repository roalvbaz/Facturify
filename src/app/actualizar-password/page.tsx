'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { verifyResetCodeAction } from '@/app/actions/auth';

// Suspense boundary requerido por useSearchParams en builds estáticos (prod).
export default function ActualizarPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ActualizarPasswordForm />
    </Suspense>
  );
}

function ActualizarPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  const strength = (): { label: string; color: string; width: string } | null => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score === 0) return null;
    if (score <= 2) return { label: 'Débil', color: '#ef4444', width: '33%' };
    if (score <= 3) return { label: 'Media', color: '#f59e0b', width: '66%' };
    return { label: 'Fuerte', color: '#10b981', width: '100%' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const res = await verifyResetCodeAction(email, code, password);

    if (res.success) {
      setDone(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } else {
      setError(res.error || 'Error al actualizar la contraseña');
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
      <div className="rp-card login-card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Image src="/img/banner.png" alt="FacturON Logo" width={432} height={121} priority style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} />
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#f0fdf4', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>¡Contraseña actualizada!</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Te llevamos a tu panel de control...</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0fdfa', border: '2px solid #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Restablecer Contraseña</h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Introduce el código que recibiste por correo</p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="tu@empresa.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="code" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Código de Verificación</label>
                <input
                  type="text"
                  id="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="form-control"
                  placeholder="123456"
                  style={{ width: '100%', letterSpacing: '0.1em' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Nueva Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    id="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-control"
                    placeholder="Mínimo 8 caracteres"
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                  >
                    <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
                {password.length > 0 && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ width: strength()?.width || '0%', height: '100%', backgroundColor: strength()?.color, transition: 'width 0.2s ease', borderRadius: '999px' }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: strength()?.color || '#94a3b8', fontWeight: 600 }}>{strength()?.label}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="confirm" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Repite la Contraseña</label>
                <input
                  type={show ? 'text' : 'password'}
                  id="confirm"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-control"
                  placeholder="Repite tu contraseña"
                  style={{ width: '100%' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Guardando...' : 'Actualizar y Entrar'}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .rp-card {
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-md);
          animation: rp-fadeIn 0.4s ease;
        }
        @keyframes rp-fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
