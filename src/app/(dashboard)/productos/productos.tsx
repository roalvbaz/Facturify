import { db } from '@/db';
import { products, company_members } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, ilike, desc } from 'drizzle-orm';
import { createProductAction } from '@/actions/product.actions';
import DeleteProductButton from '@/components/deleteProductButton';
import { redirect } from 'next/navigation';

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  
  // 1. Verificación de sesión
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Extracción de la empresa activa usando query builder directo (evita el error de db.query)
  const [member] = await db
    .select()
    .from(company_members)
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  if (!member) {
    redirect('/login');
  }

  // 3. Consulta de los productos protegida por el company_id
  const items = await db
    .select()
    .from(products)
    .where(
      q
        ? and(
            eq(products.company_id, member.company_id),
            ilike(products.name, `%${q}%`)
          )
        : eq(products.company_id, member.company_id)
    )
    .orderBy(desc(products.created_at));

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* CABECERA SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
            Catálogo de Productos y Servicios
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Gestiona los conceptos predeterminados para emitir tus facturas más rápido.
          </p>
        </div>
      </div>

      {/* BLOQUE 1: FORMULARIO DE ALTA */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 0.8rem 0' }}>
          + Añadir Nuevo Concepto
        </h3>
        
        {/* Envolvemos la acción para que TS no se queje del return type */}
        <form 
          action={async (formData) => {
            'use server';
            await createProductAction(formData);
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
              name="description"
              placeholder="Descripción (opcional)" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
            />
          </div>
          <div>
            <input 
              type="number" 
              step="0.01"
              min="0"
              defaultValue={0}
              name="price"
              placeholder="Precio sin IVA (€) *" 
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', width: '100%' }}
              required 
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              name="default_vat"
              defaultValue="21"
              className="form-control" 
              style={{ height: '36px', fontSize: '0.85rem', padding: '0 8px', flex: 1 }}
            >
              <option value="21">IVA 21%</option>
              <option value="10">IVA 10%</option>
              <option value="4">IVA 4%</option>
              <option value="0">IVA 0%</option>
            </select>
            
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

      {/* BLOQUE 2: BARRA DE BÚSQUEDA */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
        <form method="GET" style={{ position: 'relative', width: '300px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
          <input 
            type="text" 
            name="q"
            defaultValue={q || ''}
            placeholder="Buscar en el catálogo..." 
            className="form-control" 
            style={{ width: '100%', height: '38px', fontSize: '0.85rem', paddingLeft: '34px' }}
          />
        </form>
      </div>

      {/* BLOQUE 3: LISTADO / TABLA */}
      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <i className="fas fa-box-open" style={{ fontSize: '2.5rem', marginBottom: '15px', opacity: 0.5 }}></i>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)', fontSize: '1rem' }}>No hay conceptos en el catálogo</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem' }}>Utiliza el formulario superior para añadir tu primer producto o servicio.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Concepto</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Descripción</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Precio Base</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'center' }}>IVA</th>
                <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.8rem 1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', color: 'var(--text-muted)' }}>
                    {item.description || "—"}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-color)' }}>
                    {(item.price_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {item.default_vat}%
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
                    <DeleteProductButton productId={item.id} productName={item.name} />
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