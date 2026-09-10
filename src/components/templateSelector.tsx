'use client';

import { useState } from 'react';
import { INVOICE_TEMPLATES, TEMPLATE_CATEGORIES, InvoiceTemplateConfig } from '@/lib/invoice-templates';
import TemplatePreview from '@/components/templatePreview';

export default function TemplateSelector({
  isOpen,
  currentTemplateId,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  currentTemplateId: string;
  onSelect: (template: InvoiceTemplateConfig) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  if (!isOpen) return null;

  const filtered = INVOICE_TEMPLATES.filter((t) => {
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  // Count per category
  const categoryCounts: Record<string, number> = {};
  INVOICE_TEMPLATES.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  const handleSelect = (template: InvoiceTemplateConfig) => {
    onSelect(template);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1rem',
              flexShrink: 0,
            }}>
              <i className="fas fa-palette"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Plantillas de Factura</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {INVOICE_TEMPLATES.length} plantillas disponibles &middot; Selecciona y se aplica automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            &times;
          </button>
        </div>

        {/* Buscador */}
        <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
            <input
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        </div>

        {/* Categorías */}
        <div style={{ padding: '0.65rem 1.5rem', display: 'flex', gap: '6px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' }}>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = cat.id === 'all' ? INVOICE_TEMPLATES.length : (categoryCounts[cat.id] || 0);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <i className={`fas ${cat.icon}`} style={{ fontSize: '0.65rem' }}></i>
                {cat.label}
                <span style={{
                  fontSize: '0.6rem',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid de plantillas */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              <i className="fas fa-search" style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}></i>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>No hay plantillas que coincidan</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Prueba con otro nombre o categoría</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {filtered.map((template) => {
                const isActive = template.id === currentTemplateId;
                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    style={{
                      border: `2px solid ${isActive ? template.accentColor : 'var(--border-color)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? `${template.accentColor}08` : 'var(--card-bg)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isActive ? `0 0 0 1px ${template.accentColor}33, 0 4px 12px ${template.accentColor}15` : '0 1px 3px rgba(0,0,0,0.04)',
                      position: 'relative',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = template.accentColor;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)`;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                      }
                    }}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 2,
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: template.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.65rem',
                        boxShadow: `0 2px 6px ${template.accentColor}66`,
                      }}>
                        <i className="fas fa-check"></i>
                      </div>
                    )}

                    {/* Preview */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '14px 14px 10px',
                      backgroundColor: 'var(--bg-color)',
                      borderBottom: '1px solid var(--border-color)',
                    }}>
                      <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }}>
                        <TemplatePreview template={template} />
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.2' }}>
                          {template.name}
                        </div>
                        <div style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                          textTransform: 'capitalize',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                          }}>
                            {template.category}
                          </span>
                          <span style={{ color: template.accentColor, fontSize: '0.65rem', fontWeight: 700 }}>
                            ● {template.headerStyle}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {filtered.length} de {INVOICE_TEMPLATES.length} plantillas
          </span>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
