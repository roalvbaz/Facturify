'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/app/actions/auth';

export default function ProfileForm({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [name, setName] = useState(fullName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const res = await updateProfileAction(new FormData(e.currentTarget));

    if (res.success) {
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'No se pudo actualizar el perfil.' });
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ padding: '1.5rem', maxWidth: '500px' }}>
      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#b91c1c',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="profile-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
            Correo Electrónico
          </label>
          <input
            type="email"
            id="profile-email"
            value={email}
            readOnly
            disabled
            className="form-control"
            style={{ width: '100%', backgroundColor: '#f1f5f9', color: '#475569', opacity: 1 }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            El correo es tu identificador de acceso y no se puede cambiar.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="full_name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
            Nombre y Apellidos *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-control"
            style={{ width: '100%' }}
            placeholder="Tu nombre completo"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.7rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}