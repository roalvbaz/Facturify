import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import IngresosChart from '@/components/ingresosChart';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userCompanies = await getUserCompanies();

  if (userCompanies.length === 0) {
    redirect('/empresas');
  }

  const activeCompanyId = await getActiveCompanyId();
  const miEmpresa = userCompanies.find((c) => c.id === activeCompanyId) || userCompanies[0];

  const companyId = miEmpresa.id;

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

  const metrics = [
    {
      label: 'Total Cobrado',
      value: `${(totalCobradoCents / 100).toFixed(2)} €`,
      icon: 'fa-check-circle',
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#10b981',
      borderColor: '#10b981',
    },
    {
      label: 'Pendiente Cobro',
      value: `${(totalPendienteCents / 100).toFixed(2)} €`,
      icon: 'fa-clock',
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    {
      label: 'Facturado Mes',
      value: `${(facturadoMesCents / 100).toFixed(2)} €`,
      icon: 'fa-calendar-alt',
      iconBg: 'rgba(14,165,233,0.12)',
      iconColor: '#0ea5e9',
      borderColor: '#0ea5e9',
    },
    {
      label: 'Total Facturas',
      value: String(facturas.length),
      icon: 'fa-file-invoice',
      iconBg: 'rgba(139,92,246,0.12)',
      iconColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.95rem',
            flexShrink: 0,
          }}>
            <i className="fas fa-chart-pie"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-color)', margin: 0, lineHeight: '1.2' }}>
              Resumen Financiero
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              {miEmpresa.name} &middot; Rol: {miEmpresa.role}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: `3px solid ${m.borderColor}`,
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: m.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`fas ${m.icon}`} style={{ fontSize: '1.1rem', color: m.iconColor }}></i>
            </div>
            <div>
              <p style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                margin: '0 0 2px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {m.label}
              </p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)', margin: 0, lineHeight: '1.2' }}>
                {m.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico y Facturas Pendientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Gráfico */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <i className="fas fa-chart-bar" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}></i>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
              Evolución de Ingresos
            </h4>
          </div>
          {facturas.length === 0 ? (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay suficientes datos para generar el gráfico</p>
            </div>
          ) : (
            <div style={{ height: '280px', position: 'relative' }}>
              <IngresosChart labels={labels} pagado={pagado} pendiente={pendiente} />
            </div>
          )}
        </div>

        {/* Facturas Pendientes */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-clock" style={{ color: '#f59e0b', fontSize: '0.9rem' }}></i>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
                Pendientes de Cobro
              </h4>
            </div>
            <Link href="/historial?status=Pendiente" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Ver todas &rarr;
            </Link>
          </div>

          <div style={{ flex: 1 }}>
            {facturasPendientes.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
                <div>
                  <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981', opacity: 0.5, marginBottom: '8px', display: 'block' }}></i>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    ¡Al día! No tienes facturas pendientes.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {facturasPendientes.map((f) => {
                  let badgeBg = 'rgba(100,116,139,0.1)';
                  let badgeColor = '#64748b';
                  let badgeText = 'Sin fecha';
                  let dotColor = '#94a3b8';

                  if (f.diasRestantes !== null) {
                    if (f.diasRestantes < 0) {
                      badgeBg = 'rgba(239,68,68,0.1)';
                      badgeColor = '#ef4444';
                      badgeText = `Vencida (${Math.abs(f.diasRestantes)}d)`;
                      dotColor = '#ef4444';
                    } else if (f.diasRestantes === 0) {
                      badgeBg = 'rgba(245,158,11,0.1)';
                      badgeColor = '#d97706';
                      badgeText = 'Vence hoy';
                      dotColor = '#f59e0b';
                    } else if (f.diasRestantes <= 7) {
                      badgeBg = 'rgba(245,158,11,0.1)';
                      badgeColor = '#d97706';
                      badgeText = `${f.diasRestantes}d`;
                      dotColor = '#f59e0b';
                    } else {
                      badgeBg = 'rgba(16,163,74,0.1)';
                      badgeColor = '#16a34a';
                      badgeText = `${f.diasRestantes}d`;
                      dotColor = '#16a34a';
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
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          flexShrink: 0,
                        }}></div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-color)' }}>
                              {f.formatted_number}
                            </strong>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                            }}>
                              {badgeText}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                            {f.customer_name || 'Cliente'}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', flexShrink: 0, marginLeft: '8px' }}>
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
