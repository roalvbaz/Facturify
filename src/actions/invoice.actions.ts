'use server';

import { db } from '@/db';
import { invoices, invoice_lines, companies, company_members, customers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Función auxiliar para construir la URL del QR de Veri*factu
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

/**
 * 1. Acción para CAMBIAR el estado de una factura de forma segura
 */
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
    console.error("❌ ERROR CRÍTICO EN toggleInvoiceStatusAction:", error);
    throw new Error(error?.message || "Error desconocido en base de datos al cambiar el estado.");
  }
}

interface EmitInvoicePayload {
  seriesCode?: string;
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

/**
 * 2. Acción para EMITIR una nueva factura recibiendo un objeto tipado
 */
export async function emitInvoiceAction(payload: EmitInvoicePayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No autorizado");
    }

    // Obtener la empresa del usuario autenticado
    const [membresia] = await db
      .select({
        companyId: companies.id,
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

    // Extraer datos del cliente del payload recibido
    const clientName = payload.customerData?.nombre || 'Cliente General';
    const clientTaxId = payload.customerData?.nif || '';
    const clientEmail = payload.customerData?.email || '';
    const clientAddress = payload.customerData?.direccion || '';
    const seriesCode = payload.seriesCode || 'F';
    
    const lines = payload.lines || [];

    if (!lines || lines.length === 0) {
      throw new Error("La factura debe contener al menos una línea de concepto.");
    }

    // GESTIÓN INTELIGENTE DE CLIENTES (Guarda y actualiza email)
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
        // Actualizamos nombre, dirección y email
        await db.update(customers)
          .set({ 
            name: clientName, 
            address: clientAddress, 
            email: clientEmail 
          })
          .where(eq(customers.id, existingClient.id));
      } else {
        // Creamos el cliente guardando explícitamente el email
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

    // Numeración secuencial por empresa, serie y año
    const currentYear = new Date().getFullYear();
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

    // Cálculo de importes en céntimos
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

    const totalCents = subtotalCents + vatTotalCents;
    const issuedAt = new Date();

    // Veri*factu: Obtener el hash anterior para el encadenamiento
    const [previousInvoice] = await db
      .select({ current_hash: invoices.current_hash })
      .from(invoices)
      .where(eq(invoices.company_id, activeCompanyId))
      .orderBy(desc(invoices.created_at))
      .limit(1);

    const prevHash = previousInvoice?.current_hash || 'PREVIOUS_HASH_GENESIS';

    // Generar cadena canónica y hash SHA-256
    const canonicalString = `${issuerTaxId}|${formattedInvoiceNumber}|${issuedAt.toISOString()}|${totalCents}|${prevHash}`;
    const currentHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    // Generar URL para el QR
    const qrUrl = construirUrlQr({
      emisorNif: issuerTaxId,
      numeroFactura: formattedInvoiceNumber,
      totalCentimos: totalCents,
      fechaExpedicion: issuedAt,
    });

    // Insertar factura
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
        status: 'Pendiente',
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

    // Insertar líneas de detalle
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

    revalidatePath('/historial');
    revalidatePath('/clientes');
    revalidatePath('/dashboard');

    return { success: true, invoiceId: nuevaFactura.id };

  } catch (error: any) {
    console.error("❌ ERROR AL EMITIR FACTURA:", error);
    throw new Error(error?.message || "No se pudo emitir la factura.");
  }
}

/**
 * 3. Acción para OBTENER la empresa activa del usuario autenticado
 */
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

/**
 * 4. Acción para OBTENER el listado de clientes de la empresa activa
 */
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