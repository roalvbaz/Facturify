/**
 * GET /api/verifactu/status/[invoiceId]
 *
 * Devuelve el estado del envío Veri*factu de una factura concreta.
 * Se usa en el frontend para mostrar el estado de la AEAT en la factura.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionByInvoiceId } from '@/lib/verifactu/queue/manager';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  if (!invoiceId) {
    return NextResponse.json({ error: 'Falta invoiceId' }, { status: 400 });
  }

  try {
    const submission = await getSubmissionByInvoiceId(invoiceId);

    if (!submission) {
      return NextResponse.json({
        submitted: false,
        status: null,
        message: 'No se ha enviado esta factura a la AEAT.',
      });
    }

    return NextResponse.json({
      submitted: true,
      status: submission.status,
      csv: submission.csv || null,
      attempts: submission.attempts,
      lastError: submission.last_error || null,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error al consultar el estado' },
      { status: 500 }
    );
  }
}
