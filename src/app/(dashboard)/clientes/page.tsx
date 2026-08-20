import { db } from '@/db';
import { customers, companies, company_members } from '@/db/schema';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DeleteCustomerButton from '@/components/deleteCustomerButton';
import { createCustomerAction } from '@/actions/customer.actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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

  const conditions = [
    eq(customers.company_id, activeCompanyId),
    eq(customers.is_active, true)
  ];

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
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* CABECERA SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
            Directorio de Clientes - {miEmpresa.companyName}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Consulta, busca y gestiona los clientes registrados en tu empresa.
          </p>
        </div>
      </div>

      {/* BLOQUE 1: FORMULARIO RÁPIDO DE ALTA */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 0.8rem 0' }}>
          + Añadir Nuevo Cliente
        </h3>
        
        <form 
          action={async (formData) => {
            'use server';
            await createCustomerAction(formData);
          }} 
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}
        >
          <div>
            <input 
              type="text" 
              name="name"
              placeholder="Nombre / Razón Social *" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
              required 
            />
          </div>
          <div>
            <input 
              type="text" 
              name="tax_id"
              placeholder="NIF / CIF *" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
              required
            />
          </div>
          <div>
            <input 
              type="email" 
              name="email"
              placeholder="Correo Electrónico *" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              name="address"
              placeholder="Dirección Fiscal (opcional)" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', flex: 1 }}
            />
            
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ fontWeight: 600, fontSize: '0.85rem', padding: '0 1.5rem', height: '36px' }}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>

      {/* BLOQUE 2: BARRA DE BÚSQUEDA Y BOTONES CON SEPARACIÓN */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Buscar por Nombre, NIF/CIF o Email
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input 
                type="text" 
                name="q"
                defaultValue={busqueda}
                placeholder="Ej: Juan Pérez, B12345678, cliente@empresa.com..." 
                className="form-control" 
                style={{ width: '100%', height: '38px', fontSize: '0.85rem', paddingLeft: '34px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                padding: '0 1.5rem', 
                height: '38px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
            >
              <i className="fas fa-search"></i>
              <span>Filtrar</span>
            </button>
            <Link
              href="/clientes"
              className="btn"
              style={{
                background: 'var(--bg-color)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '38px',
                padding: '0 1.25rem',
              }}
            >
              <i className="fas fa-undo"></i>
              <span>Reset</span>
            </Link>
          </div>
        </form>
      </div>

      {/* BLOQUE 3: LISTADO / TABLA */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {listaClientes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-users" style={{ fontSize: '2.5rem', marginBottom: '15px', opacity: 0.5 }}></i>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)', fontSize: '1rem' }}>No se encontraron clientes</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem' }}>Prueba a cambiar el término de búsqueda o añade un nuevo cliente.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Nombre / Razón Social</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>NIF / CIF</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Correo Electrónico</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Dirección Fiscal</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaClientes.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.8rem 1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>
                    {c.name || 'Cliente sin nombre'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {c.tax_id || '-'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', color: 'var(--text-muted)' }}>
                    {c.email || '-'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.address || '-'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
                    <DeleteCustomerButton customerId={c.id} customerName={c.name || 'este cliente'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}