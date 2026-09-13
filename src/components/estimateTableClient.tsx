'use client';

import { isEstimateEditable, estimateStatusLabel, estimateStatusColor } from '@/lib/estimates';
import EstimateModalClient from '@/components/estimateModalClient';

export default function EstimateTableClient({
  presupuestos,
  empresa,
  settings,
  templateId,
  companyId,
}: {
  presupuestos: any[];
  empresa: any;
  settings?: any;
  templateId?: string;
  companyId: string;
}) {
  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      <table className="data-table mobile-card-table">
        <thead>
          <tr>
            <th>Nº Presupuesto</th>
            <th>Cliente & NIF</th>
            <th>Emisión / Validez</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ textAlign: 'center' }}>Estado</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {presupuestos.map((p) => {
            const fechaEmision = p.issued_at ? new Date(p.issued_at).toLocaleDateString('es-ES') : '-';
            const fechaValidez = p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('es-ES') : '-';
            const total = ((p.total_cents || 0) / 100).toFixed(2);
            const editable = isEstimateEditable(p.status);
            const color = estimateStatusColor(p.status);

            return (
              <tr key={p.id}>
                <td data-label="Nº Presupuesto">
                  <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{p.formatted_number}</strong>
                  {p.converted_invoice_id && (
                    <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                      ➜ Factura emitida
                    </div>
                  )}
                </td>

                <td data-label="Cliente & NIF">
                  <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                    {p.client_name || 'Cliente sin nombre'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {p.client_tax_id ? `NIF: ${p.client_tax_id}` : 'Sin NIF'}
                  </span>
                </td>

                <td data-label="Emisión / Validez">
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>{fechaEmision}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Validez: {fechaValidez}
                  </span>
                </td>

                <td data-label="Total" style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-color)' }}>{total} €</strong>
                </td>

                <td data-label="Estado" style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                      backgroundColor: `${color}1a`, color,
                    }}
                    title={p.client_note ? `Nota del cliente: ${p.client_note}` : undefined}
                  >
                    <i className="fas fa-circle" style={{ fontSize: '0.4rem' }}></i>
                    {estimateStatusLabel(p.status)}
                  </span>
                  {p.status === 'Modificación solicitada' && (
                    <div style={{ fontSize: '0.68rem', color: '#ea580c', fontWeight: 600, marginTop: '3px' }}>
                      Cliente pidió cambios
                    </div>
                  )}
                </td>

                <td data-label="Acciones" style={{ textAlign: 'center' }}>
                  <EstimateModalClient
                    presupuesto={p}
                    empresa={empresa}
                    settings={settings}
                    templateId={templateId}
                    companyId={companyId}
                    editable={editable}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}