import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { companies, company_members } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function DashboardPage() {
  // 1. Verificamos quién es el usuario en Supabase Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Buscamos la empresa usando tu tabla intermedia company_members
  const membresia = await db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      role: company_members.role,
    })
    .from(company_members)
    .innerJoin(companies, eq(company_members.company_id, companies.id))
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  const miEmpresa = membresia[0];

  // 3. Pantalla de bloqueo si el usuario no tiene empresa asignada en company_members
  if (!miEmpresa) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
          <i className="fas fa-lock"></i>
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
          Cuenta en revisión
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6 }}>
          Tu usuario (<strong>{user.email}</strong>) se ha autenticado correctamente, pero aún no está vinculado a ninguna empresa en el sistema.
          <br /><br />
          Contacta con el administrador para que asigne tu acceso.
        </p>
      </div>
    );
  }

  // 4. Dashboard con los datos reales de la empresa del usuario
  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Resumen Financiero - {miEmpresa.companyName}
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          Métricas e ingresos de tu empresa en tiempo real (Rol: {miEmpresa.role}).
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cobrado</p>
          <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#10b981', margin: 0 }}>0.00 €</h3>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendiente Cobro</p>
          <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>0.00 €</h3>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Facturado Mes</p>
          <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0ea5e9', margin: 0 }}>0.00 €</h3>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Facturas</p>
          <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>0</h3>
        </div>
      </div>

      {/* Gráficos y Tablas Placeholder */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem', marginTop: 0 }}>Evolución de Ingresos</h4>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No hay suficientes datos para generar el gráfico</p>
          </div>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Vencen en 7 días</h4>
            <a href="/historial" style={{ fontSize: '0.875rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>Ver todas &rarr;</a>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No hay facturas a punto de vencer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}