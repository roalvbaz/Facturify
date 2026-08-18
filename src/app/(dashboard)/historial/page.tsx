import { db } from '@/db';
import { invoices, invoice_lines, companies, company_members, customers } from '@/db/schema';
import { eq, desc, and, ilike } from 'drizzle-orm';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InvoiceModalClient from '@/components/invoiceModalClient';
import InvoiceStatusButton from '@/components/invoiceStatusButton';

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  // 1. Identificamos al usuario desde Supabase Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Buscamos la empresa asignada al usuario
  const membresia = await db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      NIF: companies.tax_id,
      address: companies.address,
    })
    .from(company_members)
    .innerJoin(companies, eq(company_members.company_id, companies.id))
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  const miEmpresa = membresia[0];

  if (!miEmpresa) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Sin empresa asignada</h2>
        <p>Tu usuario no tiene ninguna empresa asociada para ver el historial.</p>
      </div>
    );
  }

  const activeCompanyId = miEmpresa.companyId;
  const busqueda = resolvedSearchParams.q || '';
  const estadoFiltro = resolvedSearchParams.status || 'Todas';

  // 3. Filtramos estrictamente por la empresa activa del usuario
  const conditions = [eq(invoices.company_id, activeCompanyId)];
  if (busqueda) {
    conditions.push(ilike(invoices.formatted_number, `%${busqueda}%`));
  }
  if (estadoFiltro !== 'Todas') {
    conditions.push(eq((invoices as any).status, estadoFiltro));
  }

  // Consulta con LEFT JOIN a customers para traer nombre, nif y dirección del cliente real
  const listaFacturas = await db
    .select({
      id: invoices.id,
      company_id: invoices.company_id,
      customer_id: invoices.customer_id,
      series_code: invoices.series_code,
      year: invoices.year,
      number: invoices.number,
      formatted_number: invoices.formatted_number,
      issued_at: invoices.issued_at,
      status: (invoices as any).status,
      subtotal_cents: invoices.subtotal_cents,
      vat_total_cents: invoices.vat_total_cents,
      total_cents: invoices.total_cents,
      qr_code_url: invoices.qr_code_url,
      current_hash: invoices.current_hash,
      client_name: customers.name,
      client_tax_id: customers.tax_id,
      client_address: customers.address,
      client_email: customers.email,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customer_id, customers.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.issued_at));

  const empresa = {
    id: miEmpresa.companyId,
    name: miEmpresa.companyName,
    nif: miEmpresa.NIF,
    address: miEmpresa.address,
  };

  const todasLasLineas = await db.select().from(invoice_lines);

  const facturasConLineas = listaFacturas.map((f) => ({
    ...f,
    lines: todasLasLineas.filter((l) => l.invoice_id === f.id),
  }));

  // Server Action para alternar el estado
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

    return { success: true, newStatus };
  }

  return (
    <div>
      <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>Historial de Facturas - {miEmpresa.companyName}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Consulta, busca, filtra, previsualiza y descarga tus facturas en PDF.</p>
        </div>
        <div>
          <Link href="/nueva-factura" className="btn btn-primary" style={{ textDecoration: 'none', width: 'auto' }}>
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
                          <InvoiceStatusButton 
                            invoiceId={f.id} 
                            initialStatus={estado}  
                          />
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