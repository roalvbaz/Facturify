'use server';

import { db } from '@/db';
import { invoices, invoice_lines, companies, company_members, customers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sendInvoiceEmail } from '@/lib/email/email';

function construirUrlQr({ emisorNif, numeroFactura, totalCentimos, fechaExpedicion }: {
  emisorNif: string;
  numeroFactura: string;
  totalCentimos: number;
  fechaExpedicion: Date;
}) {
  const fechaStr = fechaExpedicion.toISOString().split('T')[0].replace(/-/g, '');
  const totalEur = (totalCentimos / 100).toFixed(2);
  return `https://www.agenciatributaria.es/qr?nif=${emisorNif}&num=${numeroFactura}&fecha=${fechaStr}&importe=${totalEur}`;
}

export async function toggleInvoiceStatusAction(id: string, currentStatus: string) {
  try {
    const normalizedStatus = (currentStatus || '').toLowerCase().trim();
    const isPaid = normalizedStatus === 'pagada' || normalizedStatus === 'paid' || normalizedStatus.includes('pagad');
    const newStatus = isPaid ? 'Pendiente' : 'Pagada';

    await db
      .update(invoices)
      .set({ status: newStatus } as any)
      .where(eq(invoices.id, id));

    revalidatePath('/historial');
    revalidatePath('/dashboard');

    return { success: true, newStatus };
  } catch (error: any) {
    console.error("❌ ERROR EN toggleInvoiceStatusAction:", error);
    throw new Error(error?.message || "Error al cambiar el estado.");
  }
}

interface EmitInvoicePayload {
  seriesCode?: string;
  issuedDate?: string;
  dueDate?: string;
  paymentMethod?: string;
  irpfRate?: number;
  sendEmail?: boolean;
  pdfBase64?: string;
  rectifiesInvoiceId?: string;
  rectificationReason?: string;
  customerData?: {
    nombre?: string;
    nif?: string;
    email?: string;
    direccion?: string;
  };
  lines: Array<{
    description: string;
    quantity: number | string;
    unit_price: number | string;
    vat_rate?: number | string;
  }>;
}

export async function emitInvoiceAction(payload: EmitInvoicePayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No autorizado");
    }

    if (!payload.customerData?.nombre?.trim()) {
      throw new Error("El nombre o razón social del cliente es obligatorio.");
    }
    if (!payload.customerData?.nif?.trim()) {
      throw new Error("El NIF/CIF del cliente es obligatorio.");
    }
    if (!payload.customerData?.email?.trim()) {
      throw new Error("El correo electrónico del cliente es obligatorio.");
    }
    if (!payload.dueDate || !payload.dueDate.trim()) {
      throw new Error("La fecha de vencimiento es obligatoria.");
    }
    if (!payload.lines || payload.lines.length === 0) {
      throw new Error("La factura debe contener al menos un concepto.");
    }

    for (const line of payload.lines) {
      if (!line.description || !line.description.trim()) {
        throw new Error("Todos los conceptos deben tener una descripción.");
      }
      if (line.quantity === undefined || line.quantity === null || Number(line.quantity) === 0) {
        throw new Error("La cantidad de cada concepto debe ser distinta de 0.");
      }
    }

    const [membresia] = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        taxId: companies.tax_id,
      })
      .from(company_members)
      .innerJoin(companies, eq(company_members.company_id, companies.id))
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!membresia) {
      throw new Error("El usuario no tiene ninguna empresa asociada.");
    }

    const activeCompanyId = membresia.companyId;
    const issuerTaxId = membresia.taxId || "A00000000";

    const clientName = payload.customerData?.nombre || 'Cliente General';
    const clientTaxId = payload.customerData?.nif || '';
    const clientEmail = payload.customerData?.email || '';
    const clientAddress = payload.customerData?.direccion || '';
    
    const isRectification = Boolean(payload.rectifiesInvoiceId);
    const seriesCode = payload.seriesCode || (isRectification ? 'R' : 'F');
    
    let initialStatus = 'Pendiente';
    if (isRectification) {
      initialStatus = 'Pagada';
    } else {
      const immediateMethods = ['TARJETA', 'EFECTIVO', 'BIZUM'];
      if (payload.paymentMethod && immediateMethods.includes(payload.paymentMethod)) {
        initialStatus = 'Pagada';
      }
    }

    const lines = payload.lines || [];

    // Gestión del cliente
    let finalCustomerId: string | null = null;
    if (clientTaxId && clientTaxId.trim() !== '' && clientTaxId !== '-') {
      const [existingClient] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.company_id, activeCompanyId),
            eq(customers.tax_id, clientTaxId)
          )
        )
        .limit(1);

      if (existingClient) {
        finalCustomerId = existingClient.id;
        await db.update(customers)
          .set({ 
            name: clientName, 
            address: clientAddress, 
            email: clientEmail 
          })
          .where(eq(customers.id, existingClient.id));
      } else {
        const [newClient] = await db
          .insert(customers)
          .values({
            company_id: activeCompanyId,
            name: clientName,
            tax_id: clientTaxId,
            email: clientEmail,
            address: clientAddress,
          })
          .returning({ id: customers.id });

        finalCustomerId = newClient.id;
      }
    }

    const issuedAt = payload.issuedDate ? new Date(payload.issuedDate) : new Date();
    const currentYear = issuedAt.getFullYear();

    const [lastInvoice] = await db
      .select({ number: invoices.number })
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, activeCompanyId),
          eq(invoices.series_code, seriesCode),
          eq(invoices.year, currentYear)
        )
      )
      .orderBy(desc(invoices.number))
      .limit(1);

    const nextNumber = lastInvoice ? lastInvoice.number + 1 : 1;
    const formattedInvoiceNumber = `${seriesCode}-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    let subtotalCents = 0;
    let vatTotalCents = 0;

    const formattedLines = lines.map((l: any) => {
      const qty = parseFloat(l.quantity) || 1;
      const unitPriceCents = Math.round((parseFloat(l.unit_price) || 0) * 100);
      const lineSubtotal = Math.round(qty * unitPriceCents);
      const vatRate = parseFloat(l.vat_rate) || 21;
      const lineVat = Math.round(lineSubtotal * (vatRate / 100));
      const lineTotal = lineSubtotal + lineVat;

      subtotalCents += lineSubtotal;
      vatTotalCents += lineVat;

      return {
        description: l.description,
        quantity: qty.toString(),
        unit_price_cents: unitPriceCents,
        vat_percent: vatRate.toString(),
        total_amount_cents: lineTotal,
      };
    });

    const irpfPercent = Number(payload.irpfRate) || 0;
    const irpfTotalCents = Math.round(subtotalCents * (irpfPercent / 100));
    const totalCents = subtotalCents + vatTotalCents - irpfTotalCents;

    const [previousInvoice] = await db
      .select({ current_hash: invoices.current_hash })
      .from(invoices)
      .where(eq(invoices.company_id, activeCompanyId))
      .orderBy(desc(invoices.created_at))
      .limit(1);

    const prevHash = previousInvoice?.current_hash || 'PREVIOUS_HASH_GENESIS';
    const canonicalString = `${issuerTaxId}|${formattedInvoiceNumber}|${issuedAt.toISOString()}|${totalCents}|${prevHash}`;
    const currentHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    const qrUrl = construirUrlQr({
      emisorNif: issuerTaxId,
      numeroFactura: formattedInvoiceNumber,
      totalCentimos: totalCents,
      fechaExpedicion: issuedAt,
    });

    const parsedDueDate = payload.dueDate && payload.dueDate.trim() !== '' 
      ? new Date(payload.dueDate) 
      : null;

    const [nuevaFactura] = await db
      .insert(invoices)
      .values({
        company_id: activeCompanyId,
        customer_id: finalCustomerId,
        series_code: seriesCode,
        year: currentYear,
        number: nextNumber,
        formatted_number: formattedInvoiceNumber,
        issued_at: issuedAt,
        due_date: parsedDueDate,
        status: initialStatus,
        rectifies_invoice_id: payload.rectifiesInvoiceId || null,
        rectification_type: isRectification ? 'DIFERENCIAS' : null,
        rectification_reason: payload.rectificationReason || null,
        prev_hash: prevHash,
        current_hash: currentHash,
        canonical_string: canonicalString,
        qr_code_url: qrUrl,
        subtotal_cents: subtotalCents,
        vat_total_cents: vatTotalCents,
        total_cents: totalCents,
        currency: 'EUR',
        is_locked: true,
      })
      .returning({ id: invoices.id });

    for (const line of formattedLines) {
      await db.insert(invoice_lines).values({
        invoice_id: nuevaFactura.id,
        description: line.description,
        quantity: line.quantity,
        unit_price_cents: line.unit_price_cents,
        vat_percent: line.vat_percent,
        total_amount_cents: line.total_amount_cents,
      });
    }

    // ENVÍO AUTOMÁTICO DIRECTO AL CLIENTE (SIN COPIA AL EMISOR)
    let emailSent = false;
    if (payload.sendEmail !== false && clientEmail) {
      try {
        await sendInvoiceEmail({
          to: clientEmail,
          clientName: clientName,
          invoiceNumber: formattedInvoiceNumber,
          totalEur: (totalCents / 100).toFixed(2),
          companyName: membresia.companyName,
          pdfBase64: payload.pdfBase64,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("❌ Error enviando email en emisión:", mailErr);
      }
    }

    revalidatePath('/historial');
    revalidatePath('/clientes');
    revalidatePath('/dashboard');

    return { 
      success: true, 
      invoiceId: nuevaFactura.id, 
      formattedNumber: formattedInvoiceNumber,
      emailSent 
    };

  } catch (error: any) {
    console.error("❌ ERROR AL EMITIR FACTURA:", error);
    throw new Error(error?.message || "No se pudo emitir la factura.");
  }
}

export async function getActiveCompanyAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, company: null };
    }

    const membresia = await db
      .select({
        id: companies.id,
        name: companies.name,
        tax_id: companies.tax_id,
        address: companies.address,
      })
      .from(company_members)
      .innerJoin(companies, eq(company_members.company_id, companies.id))
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    return { 
      success: true, 
      company: membresia[0] || null 
    };
  } catch (error: any) {
    console.error("❌ ERROR AL OBTENER EMPRESA ACTIVA:", error);
    return { success: false, company: null };
  }
}

export async function getCompanyCustomersAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, customers: [] };
    }

    const [membresia] = await db
      .select({ companyId: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!membresia) {
      return { success: false, customers: [] };
    }

    const clientList = await db
      .select({
        id: customers.id,
        name: customers.name,
        tax_id: customers.tax_id,
        email: customers.email,
        address: customers.address,
      })
      .from(customers)
      .where(eq(customers.company_id, membresia.companyId))
      .orderBy(customers.name);

    return { success: true, customers: clientList };
  } catch (error: any) {
    console.error("❌ ERROR AL OBTENER CLIENTES:", error);
    return { success: false, customers: [] };
  }
}