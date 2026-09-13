import { getEstimateByTokenAction } from '@/actions/estimate.actions';
import EstimateRespond from '@/components/estimateRespondClient';
import { estimateStatusLabel } from '@/lib/estimates';

export const metadata = { title: 'Presupuesto' };

const eur = (cents?: number | null) => `${((cents || 0) / 100).toFixed(2)} €`;

function fmtDate(d?: Date | string | null): string {
  if (!d) return '-';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function PresupuestoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getEstimateByTokenAction(token);

  if (!data.success || !data.estimate || !data.company) {
    return (
      <PublicShell>
        <div style={{ maxWidth: '560px', margin: '80px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '12px' }}></i>
          <h2 style={{ color: 'var(--text-main)', fontWeight: 800 }}>Presupuesto no disponible</h2>
          <p style={{ fontSize: '0.9rem' }}>{data.error}</p>
        </div>
      </PublicShell>
    );
  }

  const e = data.estimate;
  const statusColor: Record<string, string> = {
    Borrador: 'hsl(215 20% 45%)',
    Enviado: 'hsl(199 90% 48%)',
    Aceptado: 'hsl(142 71% 45%)',
    Rechazado: 'hsl(0 72% 51%)',
    'Modificación solicitada': 'hsl(32 95% 44%)',
    Facturado: 'hsl(215 16% 47%)',
  };

  return (
    <PublicShell>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Cabecera empresa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{data.company.name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              NIF: {data.company.tax_id || '-'} · {data.company.address || '-'} {data.company.postal_code || ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nº</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'ui-monospace, monospace' }}>{e.formatted_number}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Emitido el {fmtDate(e.issued_at)}
            </div>
            {e.expiry_date && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Validez hasta {fmtDate(e.expiry_date)}
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Presupuesto para:</div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{data.customer?.name || 'Cliente'}</div>
          {data.customer?.tax_id && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>NIF/CIF: {data.customer.tax_id}</div>}
          {data.customer?.address && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{data.customer.address}</div>}
        </div>

        {/* Estado */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px',
              backgroundColor: `${statusColor[e.status] || '#64748b'}1f`, color: statusColor[e.status] || 'var(--text-main)',
              fontSize: '0.8rem', fontWeight: 700,
            }}
          >
            <i className="fas fa-circle" style={{ fontSize: '0.4rem' }}></i>
            {estimateStatusLabel(e.status)}
          </span>
          {e.isExpired && e.status === 'Enviado' && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(0 72% 51%)' }}>
              ⏰ Este presupuesto ha caducado.
            </span>
          )}
        </div>

        {/* Conceptos */}
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--muted-bg, #f1f5f9)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>CONCEPTO</th>
                <th style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700 }}>CANT.</th>
                <th style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>P. UD.</th>
                <th style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700 }}>IVA</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin conceptos</td></tr>
              ) : (
                data.lines.map((l: any) => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)' }}>{l.description}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{parseFloat(l.quantity || 1).toFixed(2)}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--text-muted)' }}>{eur(l.unit_price_cents)}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{Number(l.vat_percent || 0) > 0 ? `${Number(l.vat_percent)}%` : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>{eur(l.total_amount_cents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(e.notes || data.customer?.email) && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {e.notes && <p style={{ margin: '0 0 4px' }}><strong>Notas:</strong> {e.notes}</p>}
          </div>
        )}

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '260px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>Base imponible</span><span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{eur(e.subtotal_cents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>IVA</span><span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{eur(e.vat_total_cents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', borderTop: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>
              <span>TOTAL</span><span>{eur(e.total_cents)}</span>
            </div>
          </div>
        </div>

        {/* Zona de respuesta */}
        <div style={{ marginTop: '1.5rem' }}>
          {e.client_note && (e.status === 'Rechazado' || e.status === 'Modificación solicitada') && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.85rem',
              backgroundColor: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', color: 'var(--text-main)',
            }}>
              <strong>Tu {e.status === 'Rechazado' ? 'motivo' : 'solicitud'}:</strong> {e.client_note}
            </div>
          )}
          <EstimateRespond
            token={token}
            status={e.status}
            respondable={e.respondable}
            isExpired={e.isExpired}
            formattedNumber={e.formatted_number}
          />
        </div>

        <div style={{ textAlign: 'center', margin: '2rem 0 1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Documento generado con FacturON. Al aceptar este presupuesto, {data.company.name} podrá emitir la factura correspondiente.
        </div>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', padding: 'clamp(16px, 4vw, 40px)' }}>
      {children}
    </div>
  );
}