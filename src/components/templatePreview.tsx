'use client';

import { InvoiceTemplateConfig } from '@/lib/invoice-templates';
import { readableTextOn, readableTextOnGradient } from '@/lib/colorUtils';

/**
 * Miniatura CSS puro de una plantilla de factura.
 * Se renderiza a 240x170px y se escala con transform: scale() dentro del selector.
 */
export default function TemplatePreview({ template }: { template: InvoiceTemplateConfig }) {
  const { accentColor, secondaryColor, headerStyle, headerLayout, tableHeaderStyle, fontFamily, showFooter } = template;

  // Header background
  const headerBg =
    headerStyle === 'gradient'
      ? `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`
      : headerStyle === 'split'
        ? accentColor
        : accentColor;

  // Header text alignment
  const headerTextAlign =
    headerLayout === 'centered' ? 'center' as const
    : headerLayout === 'left' ? 'left' as const
    : 'right' as const;

  // Header text color (WCAG contrast)
  const headerTextColor =
    headerStyle === 'gradient'
      ? readableTextOnGradient(accentColor, secondaryColor)
      : readableTextOn(accentColor);

  // Table header styles
  const tableBg =
    tableHeaderStyle === 'filled' ? accentColor
    : tableHeaderStyle === 'outlined' ? 'transparent'
    : '#f8fafc';

  const tableBorder =
    tableHeaderStyle === 'outlined' ? `1px solid ${accentColor}`
    : tableHeaderStyle === 'minimal' ? `1px solid #e2e8f0`
    : 'none';

  const tableHeaderColor =
    tableHeaderStyle === 'filled' ? headerTextColor
    : accentColor;

  // Split header: show a stripe at top
  const isSplit = headerStyle === 'split';

  return (
    <div
      style={{
        width: '240px',
        height: '170px',
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        overflow: 'hidden',
        fontFamily,
        fontSize: '4.5px',
        lineHeight: '1.35',
        color: '#1e293b',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: headerBg,
          padding: isSplit ? '5px 10px 7px' : '7px 10px',
          textAlign: headerTextAlign,
          color: headerTextColor,
          minHeight: isSplit ? '26px' : '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {isSplit && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: secondaryColor,
          }} />
        )}
        <div style={{ fontWeight: 800, fontSize: '6px', marginBottom: '1px', letterSpacing: headerLayout === 'centered' ? '0.05em' : '0' }}>
          {headerLayout === 'centered' ? 'MI EMPRESA' : 'Empresa'}
        </div>
        <div style={{ fontSize: '3.8px', opacity: 0.85 }}>
          NIF: B12345678 &middot; CIF: B-12345678
        </div>
        <div style={{ fontSize: '3.5px', opacity: 0.7, marginTop: '1px' }}>
          Dirección, 28001 Madrid
        </div>
      </div>

      {/* Client block */}
      <div style={{ padding: '5px 10px', borderBottom: `1px solid #e2e8f0`, backgroundColor: '#fafbfc' }}>
        <div style={{ fontSize: '3.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, marginBottom: '1px', letterSpacing: '0.05em' }}>
          Facturar a:
        </div>
        <div style={{ fontWeight: 600, fontSize: '4px' }}>Cliente Ejemplo S.L.</div>
        <div style={{ fontSize: '3.5px', color: '#94a3b8' }}>NIF: B87654321</div>
      </div>

      {/* Table header */}
      <div style={{
        padding: '3.5px 10px',
        display: 'flex',
        gap: '3px',
        background: tableBg,
        border: tableBorder,
        color: tableHeaderColor,
        fontSize: '3.5px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.03em',
      }}>
        <span style={{ flex: 2.5 }}>Concepto</span>
        <span style={{ flex: 0.8, textAlign: 'center' }}>Cant.</span>
        <span style={{ flex: 1, textAlign: 'right' }}>P.U.</span>
        <span style={{ flex: 1.2, textAlign: 'right' }}>Total</span>
      </div>

      {/* Table rows */}
      {[
        { desc: 'Servicio de consultoría', qty: 10, price: '75.00', total: '750.00' },
        { desc: 'Licencia software anual', qty: 1, price: '360.00', total: '360.00' },
        { desc: 'Soporte técnico mensual', qty: 3, price: '45.00', total: '135.00' },
      ].map((row, i) => (
        <div key={i} style={{
          padding: '3px 10px',
          display: 'flex',
          gap: '3px',
          borderBottom: '0.5px solid #f1f5f9',
          fontSize: '3.5px',
          backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafbfc',
        }}>
          <span style={{ flex: 2.5, color: '#475569' }}>{row.desc}</span>
          <span style={{ flex: 0.8, textAlign: 'center', color: '#94a3b8' }}>{row.qty}</span>
          <span style={{ flex: 1, textAlign: 'right', color: '#64748b' }}>{row.price}€</span>
          <span style={{ flex: 1.2, textAlign: 'right', fontWeight: 600 }}>{row.total}€</span>
        </div>
      ))}

      {/* Totals */}
      <div style={{ marginTop: 'auto', padding: '4px 10px', borderTop: `1.5px solid ${accentColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '3.5px', color: '#64748b', marginBottom: '1px' }}>
          <span>Base Imponible:</span>
          <span>1.245,00€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '3.5px', color: '#64748b', marginBottom: '2px' }}>
          <span>IVA (21%):</span>
          <span>+261,45€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', alignItems: 'baseline', borderTop: `1px solid ${accentColor}22`, paddingTop: '2px' }}>
          <span style={{ fontSize: '3.5px', color: '#64748b', fontWeight: 600 }}>TOTAL:</span>
          <span style={{ fontSize: '6px', fontWeight: 800, color: accentColor }}>1.506,45€</span>
        </div>
      </div>

      {/* Optional footer line */}
      {showFooter && (
        <div style={{
          padding: '3px 10px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          fontSize: '3px',
          color: '#94a3b8',
          textAlign: 'center',
        }}>
          Gracias por su confianza &middot; www.miempresa.es
        </div>
      )}
    </div>
  );
}
