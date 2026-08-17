import { db } from '@/db';
import { invoices, invoice_lines, companies } from '@/db/schema';
import { eq, desc, and, ilike } from 'drizzle-orm';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import InvoiceModalClient from '@/components/invoiceModalClient';

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const testCompanyId = "3d8febcd-526c-4424-93f8-d8e61b6ee0df";
  const busqueda = resolvedSearchParams.q || '';
  const estadoFiltro = resolvedSearchParams.status || 'Todas';

  const conditions = [eq(invoices.company_id, testCompanyId)];
  if (busqueda) {
    conditions.push(ilike(invoices.formatted_number, `%${busqueda}%`));
  }
  if (estadoFiltro !== 'Todas') {
    conditions.push(eq((invoices as any).status, estadoFiltro));
  }

  const listaFacturas = await db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.issued_at));

  const [empresa] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, testCompanyId))
    .limit(1);

  const todasLasLineas = await db.select().from(invoice_lines);

  const facturasConLineas = listaFacturas.map(f => ({
    ...f,
    lines: todasLasLineas.filter(l => l.invoice_id === f.id)
  }));

  async function toggleStatus(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const currentStatus = formData.get('currentStatus') as string;
    const newStatus = currentStatus === 'Pagada' ? 'Pendiente' : 'Pagada';

    await db
      .update(invoices)
      .set({ status: newStatus } as any)
      .where(eq(invoices.id, id));

    revalidatePath('/historial');
    revalidatePath('/dashboard');
  }

  return (
    <div>
      <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Historial de Facturas</h2>
          <p>Consulta, busca, filtra, previsualiza y descarga tus facturas en PDF.</p>
        </div>
        <div>
          <Link href="/test-factura" className="btn btn-primary" style={{ textDecoration: 'none', width: 'auto' }}>
            <i className="fas fa-plus"></i> Nueva Factura
          </Link>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form method="GET" className="grid-3" style={{ alignItems: 'end', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Buscar por Nº Referencia</label>
            <input 
              type="text" 
              name="q"
              defaultValue={busqueda}
              className="form-control" 
              placeholder="Ej: F-2026..." 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado de Factura</label>
            <select 
              name="status"
              defaultValue={estadoFiltro}
              className="form-control"
            >
              <option value="Todas">Mostrar Todas</option>
              <option value="Pendiente">Solo Pendientes</option>
              <option value="Pagada">Solo Pagadas</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <i className="fas fa-search"></i> Filtrar
            </button>
            <a href="/historial" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              Limpiar
            </a>
          </div>
        </form>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {facturasConLineas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-file-invoice" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
            <h3>No se encontraron facturas</h3>
            <p>Prueba a cambiar los criterios de búsqueda o emite una nueva factura.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Ref</th>
                  <th>Fecha Emisión</th>
                  <th>Base Imponible</th>
                  <th>IVA</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones & PDF</th>
                </tr>
              </thead>
              <tbody>
                {facturasConLineas.map((f) => {
                  const estado = (f as any).status || 'Pendiente';
                  const esPagada = estado === 'Pagada';
                  const fecha = f.issued_at ? new Date(f.issued_at).toLocaleDateString('es-ES') : '-';
                  const base = ((f.subtotal_cents || 0) / 100).toFixed(2);
                  const iva = ((f.vat_total_cents || 0) / 100).toFixed(2);
                  const total = ((f.total_cents || 0) / 100).toFixed(2);

                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{f.formatted_number}</td>
                      <td>{fecha}</td>
                      <td>{base} €</td>
                      <td>{iva} €</td>
                      <td style={{ textAlign: 'right', fontWeight: 900 }}>{total} €</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', 
                            backgroundColor: esPagada ? '#d1fae5' : '#fef3c7', color: esPagada ? '#047857' : '#b45309'
                          }}>
                            {estado}
                          </span>
                          <form action={toggleStatus}>
                            <input type="hidden" name="id" value={f.id} />
                            <input type="hidden" name="currentStatus" value={estado} />
                            <button 
                              type="submit"
                              title={esPagada ? "Marcar como Pendiente" : "Marcar como Pagada"} 
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: esPagada ? 'var(--warning)' : 'var(--success)', fontSize: '1rem' }}
                            >
                              <i className={`fas ${esPagada ? 'fa-undo' : 'fa-check-circle'}`}></i>
                            </button>
                          </form>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <InvoiceModalClient factura={f} empresa={empresa} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}