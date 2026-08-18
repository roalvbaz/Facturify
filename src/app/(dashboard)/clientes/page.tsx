import { db } from '@/db';
import { customers, companies, company_members } from '@/db/schema';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DeleteCustomerButton from '@/components/deleteCustomerButton';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
        <p>Tu usuario no tiene ninguna empresa asociada para ver los clientes.</p>
      </div>
    );
  }

  const activeCompanyId = miEmpresa.companyId;
  const busqueda = resolvedSearchParams.q || '';

  // 3. Filtro por NIF, Nombre y Email restringido a la empresa activa
  const conditions = [eq(customers.company_id, activeCompanyId)];

  if (busqueda.trim()) {
    conditions.push(
      or(
        ilike(customers.name, `%${busqueda}%`),
        ilike(customers.tax_id, `%${busqueda}%`),
        ilike(customers.email, `%${busqueda}%`)
      )!
    );
  }

  const listaClientes = await db
    .select({
      id: customers.id,
      name: customers.name,
      tax_id: customers.tax_id,
      email: customers.email,
      address: customers.address,
      created_at: customers.created_at,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.created_at));

  return (
    <div>
      {/* CABECERA SUPERIOR */}
      <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
            Directorio de Clientes - {miEmpresa.companyName}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Consulta, busca y gestiona los clientes registrados en tu empresa.
          </p>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Buscar por Nombre, NIF/CIF o Email
            </label>
            <input
              type="text"
              name="q"
              defaultValue={busqueda}
              className="form-control"
              placeholder="Ej: Juan Pérez, B12345678, cliente@empresa.com..."
              style={{ height: '38px', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-search"></i>
              <span>Buscar</span>
            </button>
            <a
              href="/clientes"
              className="btn"
              style={{
                background: 'var(--bg-color)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '38px',
                padding: '0 1rem',
              }}
            >
              Limpiar
            </a>
          </div>
        </form>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {listaClientes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-users" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
            <h3>No se encontraron clientes</h3>
            <p>Prueba con otros términos de búsqueda o emite una nueva factura para registrar un cliente.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre / Razón Social</th>
                  <th>NIF / CIF</th>
                  <th>Correo Electrónico</th>
                  <th>Dirección Fiscal</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaClientes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-color)' }}>
                      {c.name || 'Cliente sin nombre'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {c.tax_id || '-'}
                    </td>
                    <td>{c.email || '-'}</td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.address || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <DeleteCustomerButton customerId={c.id} customerName={c.name || 'este cliente'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}