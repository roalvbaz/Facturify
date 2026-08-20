'use server';

import { db } from '@/db';
import { invoices, customers, companies, company_members } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { sendPaymentReminderEmail } from '@/lib/email/email';

export async function sendPaymentReminderAction(invoiceId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');

    const [factura] = await db
      .select({
        id: invoices.id,
        formatted_number: invoices.formatted_number,
        total_cents: invoices.total_cents,
        due_date: invoices.due_date,
        status: invoices.status,
        company_id: invoices.company_id,
        client_name: customers.name,
        client_email: customers.email,
        company_name: companies.name,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customer_id, customers.id))
      .innerJoin(companies, eq(invoices.company_id, companies.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!factura) throw new Error('Factura no encontrada');
    if (!factura.client_email) throw new Error('El cliente no tiene un email registrado');

    const dueDateFormatted = factura.due_date
      ? new Date(factura.due_date).toLocaleDateString('es-ES')
      : 'Inmediato';

    await sendPaymentReminderEmail({
      to: factura.client_email,
      clientName: factura.client_name || 'Cliente',
      invoiceNumber: factura.formatted_number,
      totalEur: ((factura.total_cents || 0) / 100).toFixed(2),
      dueDateFormatted,
      companyName: factura.company_name,
      issuerUserEmail: user.email || '',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al enviar recordatorio' };
  }
}