import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import IngresosChart from '@/components/IngresosChart/ingresosChart';

export default async function DashboardPage() {
  const testCompanyId = "3d8febcd-526c-4424-93f8-d8e61b6ee0df";

  const listaFacturas = await db
    .select()
    .from(invoices)
    .where(eq(invoices.company_id, testCompanyId))
    .orderBy(desc(invoices.issued_at));

  // --- LÓGICA DE NEGOCIO: CÁLCULOS DINÁMICOS ---
  const ahora = new Date();
  const currentMonth = ahora.getMonth();
  const currentYear = ahora.getFullYear();

  let cobradoCents = 0;
  let pendienteCents = 0;
  let mesActualCents = 0;
  
  // Usamos un Set para contar clientes únicos (por ejemplo, basándonos en su NIF si existe, o id)
  const clientesUnicos = new Set();

  // Preparamos los arrays para los últimos 6 meses del gráfico
  const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const chartLabels: string[] = [];
  const chartPagado: number[] = [0, 0, 0, 0, 0, 0];
  const chartPendiente: number[] = [0, 0, 0, 0, 0, 0];

  // Generamos las etiquetas de los últimos 6 meses (ej: "Mar 26", "Abr 26"...)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    chartLabels.push(`${mesesNombres[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`);
  }

  // Recorremos las facturas reales y vamos sumando donde toca
  listaFacturas.forEach((fac) => {
    // Nota: Ajusta "fac.status" al nombre exacto de la columna de estado en tu esquema Drizzle
    const esPagada = (fac as any).status === 'Pagada'; 
    const total = fac.total_cents || 0;
    const date = fac.issued_at ? new Date(fac.issued_at) : ahora;

    // Sumar a los KPIs Generales
    if (esPagada) cobradoCents += total;
    else pendienteCents += total;

    // Facturado este mes
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      mesActualCents += total;
    }

    // Calcular en qué posición del gráfico va esta factura (0 a 5)
    const monthDiff = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
    if (monthDiff >= 0 && monthDiff <= 5) {
      const index = 5 - monthDiff;
      if (esPagada) {
        chartPagado[index] += total / 100;
      } else {
        chartPendiente[index] += total / 100;
      }
    }
  });

  return (
    <div>
      <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Resumen Financiero</h2>
          <p>Métricas e ingresos de tu empresa en tiempo real.</p>
        </div>
        <Link href="/test-factura" className="btn btn-primary" style={{ width: 'auto', textDecoration: 'none' }}>
          <i className="fas fa-plus"></i> Crear Factura
        </Link>
      </div>

      {/* TARJETAS DE INDICADORES DINÁMICAS */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL COBRADO</span>
          <p style={{ fontSize: '24px', color: 'var(--success)', fontWeight: 900, margin: '0.5rem 0 0 0' }}>
            {(cobradoCents / 100).toFixed(2)} €
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>PENDIENTE COBRO</span>
          <p style={{ fontSize: '24px', color: 'var(--warning)', fontWeight: 900, margin: '0.5rem 0 0 0' }}>
            {(pendienteCents / 100).toFixed(2)} €
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>FACTURADO MES</span>
          <p style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 900, margin: '0.5rem 0 0 0' }}>
            {(mesActualCents / 100).toFixed(2)} €
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL FACTURAS</span>
          <p style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: 900, margin: '0.5rem 0 0 0' }}>
            {listaFacturas.length}
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)', marginTop: 0 }}>
            Evolución de Ingresos (6 meses)
          </h3>
          <div style={{ height: '280px', width: '100%' }}>
            {/* PASAMOS LOS DATOS REALES AL COMPONENTE */}
            <IngresosChart labels={chartLabels} pagado={chartPagado} pendiente={chartPendiente} />
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Vencen en 7 días</h3>
            <Link href="/historial" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none' }}>
              Ver todas &rarr;
            </Link>
          </div>
          <table className="data-table" style={{ margin: 0 }}>
            <tbody>
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay facturas a punto de vencer.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DE HISTORIAL (Mismo código de antes) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Historial de Facturas (Veri*factu)</h3>
        </div>
        <table className="data-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Nº Ref</th>
              <th>Serie / Año</th>
              <th>Fecha Emisión</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'center' }}>Hash Actual (Extracto)</th>
            </tr>
          </thead>
          <tbody>
            {listaFacturas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay facturas emitidas todavía. ¡Prueba a emitir una!
                </td>
              </tr>
            ) : (
              listaFacturas.map((fac) => (
                <tr key={fac.id}>
                  <td style={{ fontWeight: '700' }}>{fac.formatted_number}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{fac.series_code} / {fac.year}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {fac.issued_at ? new Date(fac.issued_at).toLocaleDateString() : 'Sin fecha'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--primary)' }}>
                    {(fac.total_cents / 100).toFixed(2)} €
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                      {fac.current_hash ? `${fac.current_hash.substring(0, 16)}...` : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}