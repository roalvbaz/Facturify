import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, customers, companies, company_members } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sendPaymentReminderEmail } from '@/lib/email/email';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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