'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReCAPTCHA from 'react-google-recaptcha';

export default function RegisterForm({
  token,
  email,
  sitekey,
}: {
  token: string;
  email: string;
  sitekey: string;
}) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Por favor, escribe tu nombre y apellidos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setError('Por favor, completa el reCAPTCHA para demostrar que no eres un robot.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          password,
          recaptchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear tu cuenta.');
        recaptchaRef.current?.reset();
        setLoading(false);
        return;
      }

      // Cuenta creada: si además nos dieron sesión, al onboarding.
      // Si no (caso raro), le pedimos que inicie sesión.
      if (data.requiresLogin) {
        router.push('/login');
      } else {
        router.push('/empresas');
        router.refresh();
      }
    } catch (err) {
      setError('Ocurrió un error al conectar con el servidor.');
      recaptchaRef.current?.reset();
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Crea tu perfil</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Define quién eres y tu contraseña de acceso. Tu correo ya está reservado.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              readOnly
              disabled
              className="form-control"
              style={{ width: '100%', backgroundColor: '#f1f5f9', color: '#475569', opacity: 1 }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>El correo no se puede cambiar durante el registro.</span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="fullName" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Nombre y Apellidos *
            </label>
            <input
              type="text"
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Ej: María García López"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Contraseña *
            </label>
            <input
              type="password"
              id="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="confirm" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Repite la Contraseña *
            </label>
            <input
              type="password"
              id="confirm"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Repite tu contraseña"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <ReCAPTCHA ref={recaptchaRef} sitekey={sitekey} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creando tu cuenta...' : 'Crear mi Perfil'}
          </button>
        </form>
      </div>
    </div>
  );
}