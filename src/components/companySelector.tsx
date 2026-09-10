'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveCompanyAction } from '@/actions/company.actions';

interface Company {
  id: string;
  name: string;
  tax_id: string;
  role: string;
}

export default function CompanySelector({
  companies,
  activeCompanyId,
}: {
  companies: Company[];
  activeCompanyId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Empresa que se muestra en el trigger de la sidebar
  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  // Filtro local por nombre o CIF
  const filtered = companies.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.tax_id.toLowerCase().includes(q)
    );
  });

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setSearch('');
    startTransition(async () => {
      await setActiveCompanyAction(id);
      router.refresh();
    });
  };

  // Etiqueta del rol con color
  const roleBadge = (role: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      OWNER: { bg: '#fef3c7', text: '#92400e' },
      ADMIN: { bg: '#dbeafe', text: '#1e40af' },
      MEMBER: { bg: '#dcfce7', text: '#166534' },
    };
    const c = colors[role] || colors.MEMBER;
    return (
      <span
        style={{
          backgroundColor: c.bg,
          color: c.text,
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          padding: '3px 8px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
        }}
      >
        {role}
      </span>
    );
  };

  return (
    <>
      {/* TRIGGER: botón con la empresa activa */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        title="Cambiar de empresa"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          backgroundColor: '#334155',
          border: '1px solid #475569',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#f8fafc',
          textAlign: 'left',
          transition: 'all 0.2s ease-in-out',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <span style={{ flexShrink: 0 }}>
          <i className="fas fa-building" style={{ fontSize: '0.95rem', color: '#94a3b8' }}></i>
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
            {activeCompany?.name ?? 'Sin empresa'}
          </span>
          {activeCompany?.tax_id && (
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeCompany.tax_id}
            </span>
          )}
        </span>
        <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
      </button>

      {/* MODAL (estructura igual que productCatalogSelector) */}
      {isOpen && (
        <div
          style={{
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
            padding: '1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
<<<<<<< HEAD
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: 'var(--bg-color)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>Cambiar de Empresa</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona la empresa activa para trabajar con ella</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Buscador */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                <input
                  type="text"
                  placeholder="Buscar por nombre o CIF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', paddingLeft: '35px', height: '38px', fontSize: '0.9rem' }}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de empresas */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <i className="fas fa-building" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }}></i>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)' }}>No hay empresas que coincidan</p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Prueba con otro nombre o CIF</p>
                </div>
              ) : (
                filtered.map((comp) => {
                  const isActive = comp.id === activeCompanyId;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => handleSelect(comp.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        border: `1px solid ${isActive ? '#6366f1' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                      onMouseOut={(e) => (e.currentTarget.style.borderColor = isActive ? '#6366f1' : 'var(--border-color)')}
                    >
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {comp.name}
                          {isActive && (
                            <i className="fas fa-check-circle" style={{ marginLeft: '8px', color: '#6366f1', fontSize: '0.8rem' }}></i>
                          )}
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.tax_id}</p>
                      </div>
                      {roleBadge(comp.role)}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
              <button type="button" className="btn" onClick={() => setIsOpen(false)} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
=======
          {companies.map((comp) => (
            <option key={comp.id} value={comp.id} className="bg-white dark:bg-slate-900">
              {comp.name}
            </option>
          ))}
        </select>
      </div>
    </div>
>>>>>>> 1db09d07de85b7fa918f95f8f6ec25e7ff18974d
  );
}