import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, customers, companies, company_members } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sendPaymentReminderEmail } from '@/lib/email/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// El cron lo dispara un planificador externo (p.ej. cron-job.org). Se
// protege con un secreto compartido en el header `x-cron-secret` (o
// `Authorization: Bearer <secreto>`), igual que /api/admin/invite.
function checkCronSecret(request: NextRequest): NextResponse | null {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no está configurado en el servidor.' },
      { status: 500 }
    );
  }

  const suppliedSecret =
    request.headers.get('x-cron-secret') ||
    (request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null);

  if (!suppliedSecret || suppliedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // 0. Guard de autenticación del cron
    const denied = checkCronSecret(request);
    if (denied) return denied;
    // Calculamos el rango de vencimiento: dentro de 7 días
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar facturas pendientes que vencen en 7 días
    const pendingInvoices = await db
      .select({
        id: invoices.id,
        formatted_number: invoices.formatted_number,
        total_cents: invoices.total_cents,
        due_date: (invoices as any).due_date,
        client_name: customers.name,
        client_email: customers.email,
        company_name: companies.name,
        company_id: companies.id,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customer_id, customers.id))
      .innerJoin(companies, eq(invoices.company_id, companies.id))
      .where(
        and(
          eq((invoices as any).status, 'Pendiente'),
          gte((invoices as any).due_date, startOfDay),
          lte((invoices as any).due_date, endOfDay)
        )
      );

    // Cliente administrativo de Supabase para obtener el email real del usuario creador
    const supabaseAdmin = createAdminClient();

    let sentCount = 0;

    for (const inv of pendingInvoices) {
      if (!inv.client_email || !inv.client_email.trim()) continue;

      // Obtener el usuario miembro de la empresa
      const [member] = await db
        .select({ user_id: company_members.user_id })
        .from(company_members)
        .where(eq(company_members.company_id, inv.company_id))
        .limit(1);

      let issuerUserEmail = process.env.EMAIL_USER!;

      if (member?.user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
        if (userData?.user?.email) {
          issuerUserEmail = userData.user.email;
        }
      }

      const totalEur = ((inv.total_cents || 0) / 100).toFixed(2);
      const dueDateFormatted = new Date(inv.due_date).toLocaleDateString('es-ES');

      await sendPaymentReminderEmail({
        to: inv.client_email,
        clientName: inv.client_name || 'Cliente',
        invoiceNumber: inv.formatted_number,
        totalEur,
        dueDateFormatted,
        companyName: inv.company_name,
        issuerUserEmail,
      });

      sentCount++;
    }

    // Auditoría: ejecución del cron (sin usuario ni empresa asociados).
    await logAuditEvent({
      eventCode: 'CRON_PAYMENT_REMINDERS_RUN',
      description: `Ejecución del cron de recordatorios de pago`,
      metadata: { processed: pendingInvoices.length, sent: sentCount },
    });

    return NextResponse.json({
      success: true,
      processed: pendingInvoices.length,
      sent: sentCount,
    });
  } catch (error: any) {
    console.error('❌ Error en cron payment-reminders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}