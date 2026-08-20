'use client';

import { useState, useEffect } from 'react';
import InvoiceModalClient from '@/components/invoiceModalClient';
import InvoiceStatusButton from '@/components/invoiceStatusButton';

interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { id: 'number', label: 'Nº Factura', defaultVisible: true },
  { id: 'client', label: 'Cliente & NIF', defaultVisible: true },
  { id: 'dates', label: 'Emisión / Vencimiento', defaultVisible: true },
  { id: 'items', label: 'Conceptos', defaultVisible: false },
  { id: 'breakdown', label: 'Base & IVA', defaultVisible: false },
];

export default function InvoicesTableClient({
  facturas,
  empresa,
  settings,
}: {
  facturas: any[];
  empresa: any;
  settings?: any;
}) {
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('facturify_invoice_columns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
        return;
      } catch (e) {
        console.error(e);
      }
    }
    const initial: { [key: string]: boolean } = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      initial[col.id] = col.defaultVisible;
    });
    setVisibleColumns(initial);
  }, []);

  const toggleColumn = (id: string) => {
    const updated = { ...visibleColumns, [id]: !visibleColumns[id] };
    setVisibleColumns(updated);
    localStorage.setItem('facturify_invoice_columns', JSON.stringify(updated));
  };

  const isColVisible = (id: string) => visibleColumns[id] !== false;

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón selector de columnas con z-index */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          padding: '0.75rem 1.25rem', 
          borderBottom: '1px solid var(--border-color)', 
          backgroundColor: 'var(--bg-color)', 
          position: 'relative',
          zIndex: 30 
        }}
      >
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            cursor: 'pointer',
            borderRadius: '6px',
          }}
        >
          <i className="fas fa-columns" style={{ color: 'var(--primary)' }}></i>
          <span>Personalizar Columnas</span>
        </button>

        {dropdownOpen && (
          <>
            <div
              onClick={() => setDropdownOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: '1.25rem',
                width: '240px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 12px 24px -4px rgba(0,0,0,0.15)',
                padding: '0.85rem',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Columnas Visibles
              </span>
              {AVAILABLE_COLUMNS.map((col) => (
                <label
                  key={col.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.825rem',
                    color: '#0f172a',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isColVisible(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', position: 'relative', zIndex: 10 }}>
        <table className="data-table">
          <thead>
            <tr>
              {isColVisible('number') && <th>Nº Factura</th>}
              {isColVisible('client') && <th>Cliente & NIF</th>}
              {isColVisible('dates') && <th>Emisión / Vencimiento</th>}
              {isColVisible('items') && <th>Conceptos</th>}
              {isColVisible('breakdown') && <th>Base & IVA</th>}
              
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => {
              const estado = f.status || 'Pendiente';
              const fechaEmision = f.issued_at ? new Date(f.issued_at).toLocaleDateString('es-ES') : '-';
              const fechaVencimiento = f.due_date ? new Date(f.due_date).toLocaleDateString('es-ES') : '-';
              const base = ((f.subtotal_cents || 0) / 100).toFixed(2);
              const iva = ((f.vat_total_cents || 0) / 100).toFixed(2);
              const total = ((f.total_cents || 0) / 100).toFixed(2);

              return (
                <tr key={f.id}>
                  {isColVisible('number') && (
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                        {f.formatted_number}
                      </strong>
                    </td>
                  )}

                  {isColVisible('client') && (
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                        {f.client_name || 'Cliente sin nombre'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {f.client_tax_id ? `NIF: ${f.client_tax_id}` : 'Sin NIF'}
                      </span>
                    </td>
                  )}

                  {isColVisible('dates') && (
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>
                        {fechaEmision}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Vence: {fechaVencimiento}
                      </span>
                    </td>
                  )}

                  {isColVisible('items') && (
                    <td style={{ maxWidth: '200px' }}>
                      <span
                        style={{ fontSize: '0.8rem', color: 'var(--text-color)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={f.lines?.map((l: any) => l.description).join(', ')}
                      >
                        {f.lines && f.lines.length > 0 ? f.lines[0].description : 'Sin conceptos'}
                      </span>
                      {f.lines && f.lines.length > 1 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                          +{f.lines.length - 1} conceptos más
                        </span>
                      )}
                    </td>
                  )}

                  {isColVisible('breakdown') && (
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-color)' }}>
                        Base: {base} €
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        IVA: +{iva} €
                      </span>
                    </td>
                  )}

                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-color)' }}>
                      {total} €
                    </strong>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <InvoiceStatusButton invoiceId={f.id} initialStatus={estado} />
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <InvoiceModalClient factura={f} empresa={empresa} settings={settings} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}