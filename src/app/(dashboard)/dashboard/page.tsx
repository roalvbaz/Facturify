import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { companies, company_members, invoices, customers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import IngresosChart from '@/components/ingresosChart';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  // 1. Identificar usuario en Supabase Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Obtener empresa activa del usuario
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

  if (!miEmpresa) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
          <i className="fas fa-lock"></i>
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 1rem 0' }}>
          Cuenta en revisión
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6 }}>
          Tu usuario (<strong>{user.email}</strong>) se ha autenticado correctamente, pero aún no está vinculado a ninguna empresa en el sistema.
        </p>
      </div>
    );
  }

  const companyId = miEmpresa.companyId;

  // 3. Consultar facturas de la empresa
  const facturas = await db
    .select({
      id: invoices.id,
      formatted_number: invoices.formatted_number,
      total_cents: invoices.total_cents,
      status: (invoices as any).status,
      issued_at: invoices.issued_at,
      due_date: (invoices as any).due_date,
      customer_name: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customer_id, customers.id))
    .where(eq(invoices.company_id, companyId))
    .orderBy(desc(invoices.issued_at));

  // 4. Calcular totales
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalCobradoCents = 0;
  let totalPendienteCents = 0;
  let facturadoMesCents = 0;

  facturas.forEach((f) => {
    const total = f.total_cents || 0;
    const status = f.status || 'Pendiente';
    const date = f.issued_at ? new Date(f.issued_at) : null;

    if (status === 'Pagada') {
      totalCobradoCents += total;
    } else {
      totalPendienteCents += total;
    }

    if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      facturadoMesCents += total;
    }
  });

  // 5. Preparar arrays requeridos por IngresosChart (labels, pagado, pendiente)
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const labels: string[] = [];
  const pagadoMap: { [key: string]: number } = {};
  const pendienteMap: { [key: string]: number } = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const key = `${meses[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    labels.push(key);
    pagadoMap[key] = 0;
    pendienteMap[key] = 0;
  }

  facturas.forEach((f) => {
    if (f.issued_at) {
      const d = new Date(f.issued_at);
      const key = `${meses[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (pagadoMap[key] !== undefined) {
        const euros = (f.total_cents || 0) / 100;
        if (f.status === 'Pagada') {
          pagadoMap[key] += euros;
        } else {
          pendienteMap[key] += euros;
        }
      }
    }
  });

  const pagado = labels.map((k) => parseFloat(pagadoMap[k].toFixed(2)));
  const pendiente = labels.map((k) => parseFloat(pendienteMap[k].toFixed(2)));

  // 6. Facturas pendientes con cálculo de vencimiento
  const facturasPendientes = facturas
    .filter((f) => f.status !== 'Pagada')
    .slice(0, 5)
    .map((f) => {
      let diasRestantes: number | null = null;

      if (f.due_date) {
        const due = new Date(f.due_date);
        const diffTime = due.getTime() - now.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else if (f.issued_at) {
        const issue = new Date(f.issued_at);
        const defaultDue = new Date(issue.getTime() + 30 * 24 * 60 * 60 * 1000);
        const diffTime = defaultDue.getTime() - now.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...f,
        diasRestantes,
      };
    });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 0.35rem 0' }}>
          Resumen Financiero - {miEmpresa.companyName}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Métricas e ingresos de tu empresa en tiempo real (Rol: {miEmpresa.role}).
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cobrado
          </p>
          <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
            {(totalCobradoCents / 100).toFixed(2)} €
          </h3>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pendiente Cobro
          </p>
          <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>
            {(totalPendienteCents / 100).toFixed(2)} €
          </h3>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Facturado Mes
          </p>
          <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0ea5e9', margin: 0 }}>
            {(facturadoMesCents / 100).toFixed(2)} €
          </h3>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Facturas
          </p>
          <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>
            {facturas.length}
          </h3>
        </div>
      </div>

      {/* Gráfico y Facturas Pendientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '1.25rem', marginTop: 0 }}>
            Evolución de Ingresos
          </h4>
          {facturas.length === 0 ? (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay suficientes datos para generar el gráfico</p>
            </div>
          ) : (
            <div style={{ height: '280px', position: 'relative' }}>
              <IngresosChart labels={labels} pagado={pagado} pendiente={pendiente} />
            </div>
          )}
        </div>
        
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
              Pendientes de Cobro
            </h4>
            <Link href="/historial?status=Pendiente" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Ver todas &rarr;
            </Link>
          </div>

          <div style={{ flex: 1 }}>
            {facturasPendientes.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  ¡Al día! No tienes facturas pendientes de cobro.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {facturasPendientes.map((f) => {
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#475569';
                  let badgeText = 'Sin fecha';

                  if (f.diasRestantes !== null) {
                    if (f.diasRestantes < 0) {
                      badgeBg = '#fee2e2';
                      badgeColor = '#ef4444';
                      badgeText = `Vencida (${Math.abs(f.diasRestantes)}d)`;
                    } else if (f.diasRestantes === 0) {
                      badgeBg = '#fef3c7';
                      badgeColor = '#d97706';
                      badgeText = 'Vence hoy';
                    } else if (f.diasRestantes <= 7) {
                      badgeBg = '#fef3c7';
                      badgeColor = '#d97706';
                      badgeText = `Vence en ${f.diasRestantes}d`;
                    } else {
                      badgeBg = '#dcfce7';
                      badgeColor = '#16a34a';
                      badgeText = `${f.diasRestantes} días restantes`;
                    }
                  }

                  return (
                    <div 
                      key={f.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        backgroundColor: 'var(--bg-color)', 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>
                            {f.formatted_number}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                            }}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          {f.customer_name || 'Cliente'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                        {((f.total_cents || 0) / 100).toFixed(2)} €
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}