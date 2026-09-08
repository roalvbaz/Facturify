'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveCompanyAction, createCompanyAction } from '@/actions/company.actions';

interface Company {
  id: string;
  name: string;
  tax_id: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
};

export default function EmpresasManager({
  companies,
  activeCompanyId,
  showOnboarding,
}: {
  companies: Company[];
  activeCompanyId: string | null;
  showOnboarding: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [highlightForm, setHighlightForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Si venimos de /empresas?nueva=1, resaltamos y centramos el formulario
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nueva') === '1') {
      setHighlightForm(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const activate = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await setActiveCompanyAction(id);
      router.refresh();
      setPendingId(null);
    });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const res = await createCompanyAction(formData);
    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(res.error || 'Error al crear la empresa');
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Lista de empresas */}
      {companies.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-building" style={{ color: 'var(--text-muted)' }}></i> Tus Empresas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {companies.map((c) => {
              const isActive = c.id === activeCompanyId;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    border: isActive ? '1px solid #0ea5e9' : '1px solid var(--border-color)',
                    backgroundColor: isActive ? 'rgba(14,165,233,0.06)' : 'var(--bg-color)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ backgroundColor: isActive ? '#0ea5e9' : '#64748b', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      <i className="fas fa-building"></i>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </strong>
                        {isActive && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#0ea5e9', color: 'white' }}>
                            ACTIVA
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIF: {c.tax_id}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>·</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ROLE_LABEL[c.role] || c.role}</span>
                      </div>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      disabled={isPending && pendingId === c.id}
                      onClick={() => activate(c.id)}
                      className="btn"
                      style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.9rem', cursor: 'pointer', opacity: isPending && pendingId === c.id ? 0.6 : 1 }}
                    >
                      {isPending && pendingId === c.id ? 'Activando...' : 'Usar empresa'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario de nueva empresa */}
      <div
        ref={formRef}
        className="card"
        style={{
          padding: '1.5rem',
          border: highlightForm ? '2px solid #0ea5e9' : '1px solid var(--border-color)',
          transition: 'border-color 0.3s ease',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-plus-circle" style={{ color: 'var(--text-muted)' }}></i>
          {showOnboarding ? 'Crea tu primera empresa' : 'Nueva Empresa'}
        </h3>
        <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Añade otra empresa para facturar con ella desde esta misma cuenta.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                Nombre / Razón Social *
              </label>
              <input type="text" name="name" required placeholder="Ej: Mi Empresa SL" className="form-control" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                NIF / CIF *
              </label>
              <input type="text" name="tax_id" required placeholder="B12345678" className="form-control" style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                Dirección Fiscal
              </label>
              <input type="text" name="address" placeholder="Calle, número, piso..." className="form-control" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                Código Postal
              </label>
              <input type="text" name="postal_code" placeholder="28001" className="form-control" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                Ciudad
              </label>
              <input type="text" name="city" placeholder="Madrid" className="form-control" style={{ width: '100%' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary"
            style={{ marginTop: '1.25rem', width: '100%', padding: '0.7rem', fontSize: '0.95rem', fontWeight: 700, opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}
          >
            {creating ? 'Creando empresa...' : showOnboarding ? 'Crear mi empresa' : 'Crear Empresa'}
          </button>
        </form>
      </div>
    </div>
  );
}
