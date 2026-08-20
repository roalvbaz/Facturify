'use client';

import { useState } from 'react';
import Link from 'next/link';
import NewExpenseModal from '@/components/newExpenseModal';
import { deleteExpenseAction } from '@/actions/expense.actions';
import { showToast } from '@/lib/utils/toast';

export default function ExpensesClientView({
  gastos,
  companyName,
  stats,
  filtros,
}: {
  gastos: any[];
  companyName: string;
  stats: { totalBase: number; totalIva: number; totalGasto: number; count: number };
  filtros: { busqueda: string; categoria: string; from: string; to: string };
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el gasto de ${name}?`)) return;
    setDeletingId(id);
    const res = await deleteExpenseAction(id);
    if (res.success) {
      showToast.success('Gasto eliminado');
    } else {
      showToast.error(res.error || 'Error al eliminar');
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
            Gastos y Compras - {companyName}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Controla facturas de proveedores, tickets y desglosa el IVA soportado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="fas fa-plus"></i>
          <span>Registrar Gasto</span>
        </button>
      </div>

      {/* TARJETAS DE RESUMEN FISCAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Gastos</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{stats.totalGasto.toFixed(2)} €</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.count} registros</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Imponible Total</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{stats.totalBase.toFixed(2)} €</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gasto neto deducible</div>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>IVA Soportado (Deducible)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', marginTop: '4px' }}>{stats.totalIva.toFixed(2)} €</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>A deducir en Mod. 303</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form method="GET" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Buscar Proveedor / Concepto</label>
            <input type="text" name="q" defaultValue={filtros.busqueda} className="form-control" placeholder="AWS, Adobe..." style={{ height: '42px', fontSize: '0.85rem' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Categoría</label>
            <select name="category" defaultValue={filtros.categoria} className="form-control" style={{ height: '42px', fontSize: '0.85rem' }}>
              <option value="Todas">Todas las Categorías</option>
              <option value="Software / SaaS">Software / SaaS</option>
              <option value="Suministros">Suministros</option>
              <option value="Servicios Profesionales">Servicios Profesionales</option>
              <option value="Alquiler">Alquiler</option>
              <option value="Material / Oficina">Material / Oficina</option>
              <option value="Dietas / Viajes">Dietas / Viajes</option>
              <option value="General">Otros Gastos</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fecha Desde</label>
            <input type="date" name="from" defaultValue={filtros.from} className="form-control" style={{ height: '42px', fontSize: '0.85rem' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fecha Hasta</label>
            <input type="date" name="to" defaultValue={filtros.to} className="form-control" style={{ height: '42px', fontSize: '0.85rem' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <i className="fas fa-search"></i> Filtrar
            </button>
            <Link href="/gastos" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', padding: '0 1rem' }}>
              Limpiar
            </Link>
          </div>
        </form>
      </div>

      {/* TABLA DE GASTOS */}
      <div className="card" style={{ padding: 0 }}>
        {gastos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-receipt" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
            <h3>No hay gastos registrados</h3>
            <p>Empieza registrando tu primer ticket o factura de compra.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor / NIF</th>
                  <th>Categoría / Concepto</th>
                  <th>Base</th>
                  <th>IVA Soportado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Ticket</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td>{new Date(g.expense_date).toLocaleDateString('es-ES')}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{g.supplier_name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.supplier_tax_id || g.invoice_reference || 'Sin NIF'}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-color)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '2px' }}>
                        {g.category}
                      </span>
                      {g.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.description}</div>}
                    </td>
                    <td>{(g.subtotal_cents / 100).toFixed(2)} €</td>
                    <td style={{ color: '#059669', fontWeight: 600 }}>+{(g.vat_amount_cents / 100).toFixed(2)} € ({g.vat_percent}%)</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                      {(g.total_cents / 100).toFixed(2)} €
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {g.receipt_url ? (
                        <a href={g.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '1.1rem' }} title="Ver archivo">
                          <i className="fas fa-file-alt"></i>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id, g.supplier_name)}
                        disabled={deletingId === g.id}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.95rem' }}
                        title="Eliminar gasto"
                      >
                        <i className={`fas ${deletingId === g.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}