'use server';

import { sendInvoiceEmail } from '@/lib/email/email';
import { createClient } from '@/lib/supabase/server';

interface SendInvoiceActionPayload {
  to: string;
  clientName: string;
  invoiceNumber: string;
  totalEur: string;
  companyName: string;
  companyEmail?: string;
  pdfBase64?: string;
}

export async function sendInvoiceByEmailAction(payload: SendInvoiceActionPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      throw new Error('No autorizado o usuario sin correo electrónico registrado.');
    }

    if (!payload.to || !payload.to.trim()) {
      throw new Error('El cliente no tiene un correo electrónico configurado.');
    }

    await sendInvoiceEmail({
      to: payload.to.trim(),
      clientName: payload.clientName,
      invoiceNumber: payload.invoiceNumber,
      totalEur: payload.totalEur,
      companyName: payload.companyName,
      issuerUserEmail: payload.companyEmail || user.email,
      pdfBase64: payload.pdfBase64,
    });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error al enviar email:', error);
    return { success: false, error: error.message || 'No se pudo enviar el correo.' };
  }
}