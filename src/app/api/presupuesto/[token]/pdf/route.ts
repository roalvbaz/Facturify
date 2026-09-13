import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { estimates, estimate_lines, customers, companies, company_settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { renderInvoicePdfBuffer } from '@/lib/pdf/invoicePdf';
import { hashEstimateToken } from '@/lib/estimates';
import { logAuditEvent } from '@/lib/audit';
import { getClientIp } from '@/lib/audit';

/**
 * Descarga pública del PDF de un presupuesto.
 * Sin sesión: solo requiere el token del enlace (verificado por hash).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 });
    }

    const tokenHash = hashEstimateToken(token);
    const [estimate] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.accept_token_hash, tokenHash))
      .limit(1);

    if (!estimate) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado. El enlace puede haber sido renovado por el emisor.' },
        { status: 404 }
      );
    }

    const [customer, company, settings, lines] = await Promise.all([
      estimate.customer_id
        ? db
            .select()
            .from(customers)
            .where(eq(customers.id, estimate.customer_id))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db
        .select()
        .from(companies)
        .where(eq(companies.id, estimate.company_id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(company_settings)
        .where(eq(company_settings.company_id, estimate.company_id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(estimate_lines)
        .where(eq(estimate_lines.estimate_id, estimate.id))
        .orderBy(estimate_lines.line_index),
    ]);

    const buffer = await renderInvoicePdfBuffer({
      factura: {
        id: estimate.id,
        formatted_number: estimate.formatted_number,
        issued_at: estimate.issued_at,
        expiry_date: estimate.expiry_date,
        client_name: customer?.name,
        client_tax_id: customer?.tax_id,
        client_address: customer?.address,
        subtotal_cents: estimate.subtotal_cents,
        vat_total_cents: estimate.vat_total_cents,
        total_cents: estimate.total_cents,
        lines,
      },
      empresa: company
        ? { name: company.name, tax_id: company.tax_id, address: company.address }
        : { name: 'FacturON', tax_id: '-', address: '' },
      settings,
      documentType: 'estimate',
      expiryDate: estimate.expiry_date || undefined,
    });

    await logAuditEvent({
      eventCode: 'ESTIMATE_PDF_DOWNLOADED',
      description: `Descarga pública del PDF del presupuesto ${estimate.formatted_number}`,
      companyId: estimate.company_id,
      userId: null,
      metadata: { estimateId: estimate.id, public: true },
      ipAddress: getClientIp(_request),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Presupuesto_${estimate.formatted_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('❌ ERROR PDF PÚBLICO DE PRESUPUESTO:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al generar el PDF.' },
      { status: 500 }
    );
  }
}