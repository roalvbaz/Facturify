'use client';

import { useState, useRef, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();

  // Capturar errores que vengan por la URL (ej: enlace de correo caducado).
  // Supabase a veces devuelve el error en el fragmento (#error=...) y otras
  // en la query string (?error=...), así que leemos ambos.
  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get('error');
    const hash = new URLSearchParams(window.location.hash.slice(1)).get('error');
    const urlError = search || hash;
    if (urlError) {
      if (urlError === 'access_denied' || urlError.includes('expired')) {
        setError('El enlace ha caducado o ya no es válido. Solicita uno nuevo.');
      } else {
        setError(decodeURIComponent(urlError));
      }
      // Limpiamos el fragmento para que no quede el error si se recarga
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = recaptchaRef.current?.getValue();
    if (!token) {
      setError('Por favor, completa el reCAPTCHA para demostrar que no eres un robot.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas');
        recaptchaRef.current?.reset();
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Ocurrió un error al conectar con el servidor.');
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '2rem' }}>
      <div className="card login-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Image
            src="/img/banner.png"
            alt="FacturON Logo"
            width={432}
            height={121}
            priority
            style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 0.5rem 0' }}>Acceso a Clientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Inicia sesión para gestionar tus facturas</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--danger-bg, #fee2e2)', color: 'var(--danger-text, #b91c1c)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="tu@empresa.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>Contraseña</label>
              <Link href="/recuperar-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>¿Aún no tienes cuenta? Escríbenos a <a href="mailto:soporte.facturon@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>soporte.facturon@gmail.com</a> y te enviaremos un enlace para crear tu perfil.</p>
        </div>
      </div>
    </div>
  );
}