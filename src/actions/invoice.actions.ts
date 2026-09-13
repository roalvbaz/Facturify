'use server';

import { db } from '@/db';
import { invoices, invoice_lines, customers, audit_logs, company_settings } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import crypto from 'crypto';
import { sendInvoiceEmail } from '@/lib/email/email';
import { buildAltaXML } from '@/lib/verifactu/xml/builder';
import { addToQueue } from '@/lib/verifactu/queue/manager';
import { CLAVE_REGIMEN } from '@/lib/verifactu/xml/types';
import { renderInvoicePdfBuffer } from '@/lib/pdf/invoicePdf';

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

    await logAuditEvent({
      eventCode: 'INVOICE_STATUS_CHANGED',
      description: `Estado de una factura cambiado a ${newStatus}`,
      metadata: { invoiceId: id, newStatus },
    });

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
  /** Deprecado: el PDF se genera en servidor al emitir (ver renderInvoicePdfBuffer). */
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

    const userCompanies = await getUserCompanies();

    if (userCompanies.length === 0) {
      throw new Error("El usuario no tiene ninguna empresa asociada.");
    }

    const activeCompanyId = await getActiveCompanyId();
    const membre = userCompanies.find((c) => c.id === activeCompanyId) || userCompanies[0];
    const issuerTaxId = membre.tax_id || "A00000000";

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

    // ──────────────────────────────────────────────────────────────
    // VERI*FACTU: Encolar envío a la AEAT (si la empresa tiene certificado)
    // ──────────────────────────────────────────────────────────────
    let verifactuQueued = false;
    try {
      const [settings] = await db
        .select()
        .from(company_settings)
        .where(eq(company_settings.company_id, activeCompanyId))
        .limit(1);

      if (settings?.aeat_pfx_data) {
        // La empresa tiene certificado → generar XML y encolar
        const issuedDateStr = issuedAt.toISOString().split('T')[0];
        const importeTotal = totalCents / 100;
        const baseImponible = subtotalCents / 100;
        const cuotaRepercutida = vatTotalCents / 100;

        // Mapear tipo de factura
        let tipoFactura: 'F1' | 'F2' | 'R1' = 'F1';
        if (isRectification) {
          tipoFactura = 'R1'; // Rectificativa por diferencias (default)
        } else if (seriesCode === 'F2') {
          tipoFactura = 'F2'; // Simplificada
        }

        // Construir líneas de detalle IVA
        const detalleIVA = formattedLines.map((l) => ({
          tipoImpositivo: parseFloat(l.vat_percent),
          baseImponible: (l.unit_price_cents * parseFloat(l.quantity)) / 100,
          cuotaRepercutida:
            ((l.unit_price_cents * parseFloat(l.quantity)) / 100) *
            (parseFloat(l.vat_percent) / 100),
        }));

        const xmlBody = buildAltaXML({
          nifEmisor: issuerTaxId,
          nombreRazonSocialEmisor: membre.name,
          ejercicio: currentYear,
          periodo: String(issuedAt.getMonth() + 1).padStart(2, '0'),
          numeroFactura: formattedInvoiceNumber,
          fechaExpedicion: issuedDateStr,
          tipoFactura,
          claveRegimen: CLAVE_REGIMEN.GENERAL,
          descripcionOperacion: `Factura ${formattedInvoiceNumber}`,
          importeTotal,
          baseImponible,
          cuotaRepercutida,
          tipoRetencion: irpfPercent || undefined,
          detalleIVA,
          destinatarios: [
            {
              nif: clientTaxId,
              nombreRazonSocial: clientName,
            },
          ],
          huella: currentHash,
          enlaceAnterior:
            prevHash && prevHash !== 'PREVIOUS_HASH_GENESIS'
              ? {
                  numSerieFactura: `${seriesCode}-${currentYear}-${String(nextNumber - 1).padStart(4, '0')}`,
                  fechaExpedicionFactura: issuedAt.toISOString().split('T')[0],
                  huellaAnterior: prevHash.toUpperCase(),
                }
              : undefined,
        });

        await addToQueue({
          companyId: activeCompanyId,
          invoiceId: nuevaFactura.id,
          operationType: 'ALTA',
          xmlBody,
        });

        verifactuQueued = true;
      }
    } catch (vfErr) {
      // La factura ya está creada; si falla el encadenado a AEAT no rompemos la emisión
      console.error('⚠️ Error encolando a Veri*factu (factura creada igualmente):', vfErr);
    }

    // ENVÍO AUTOMÁTICO DIRECTO AL CLIENTE (SIN COPIA AL EMISOR)
    // El PDF se genera EN EL SERVIDOR (sin html2canvas/CDN → nunca se cuelga).
    let emailSent = false;
    if (payload.sendEmail !== false && clientEmail) {
      try {
        let pdfBase64: string | undefined;
        try {
          const [cfg] = await db
            .select()
            .from(company_settings)
            .where(eq(company_settings.company_id, activeCompanyId))
            .limit(1);

          const buffer = await renderInvoicePdfBuffer({
            factura: {
              formatted_number: formattedInvoiceNumber,
              series_code: seriesCode,
              issued_at: issuedAt,
              due_date: parsedDueDate,
              rectifies_invoice_id: payload.rectifiesInvoiceId || null,
              rectification_reason: payload.rectificationReason || null,
              client_name: clientName,
              client_tax_id: clientTaxId,
              client_address: clientAddress,
              subtotal_cents: subtotalCents,
              vat_total_cents: vatTotalCents,
              irpf_total_cents: irpfPercent > 0 ? irpfTotalCents : 0,
              total_cents: totalCents,
              qr_code_url: qrUrl,
              lines: formattedLines,
            },
            empresa: { name: membre.name, tax_id: membre.tax_id, address: membre.address },
            settings: cfg || undefined,
          });
          pdfBase64 = buffer.toString('base64');
        } catch (pdfErr) {
          // Si falla el PDF no rompemos la emisión; se manda el email sin adjunto.
          console.error('⚠️ Error generando PDF en emisión:', pdfErr);
        }

        await sendInvoiceEmail({
          to: clientEmail,
          clientName: clientName,
          invoiceNumber: formattedInvoiceNumber,
          totalEur: (totalCents / 100).toFixed(2),
          companyName: membre.name,
          pdfBase64,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("❌ Error enviando email en emisión:", mailErr);
      }
    }

    // 🕵️ GUARDADO SILENCIOSO DE EMISIÓN EN EL AUDIT LOG
    await logAuditEvent({
      eventCode: 'INVOICE_ISSUED',
      description: `Factura ${formattedInvoiceNumber} emitida de forma inmutable (${isRectification ? 'Rectificativa' : 'Ordinaria'})`,
      companyId: activeCompanyId,
      userId: user.id,
      metadata: {
        invoiceId: nuevaFactura.id,
        formattedNumber: formattedInvoiceNumber,
        total_cents: totalCents,
      },
    });

    revalidatePath('/historial');
    revalidatePath('/clientes');
    revalidatePath('/dashboard');

    return {
      success: true,
      invoiceId: nuevaFactura.id,
      formattedNumber: formattedInvoiceNumber,
      emailSent,
      verifactuQueued,
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

    const userCompanies = await getUserCompanies();

    if (userCompanies.length === 0) {
      return { success: false, company: null };
    }

    const activeCompanyId = await getActiveCompanyId();
    const membre = userCompanies.find((c) => c.id === activeCompanyId) || userCompanies[0];

    return {
      success: true,
      company: {
        id: membre.id,
        name: membre.name,
        tax_id: membre.tax_id,
        address: membre.address,
      },
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

    const companyId = await getActiveCompanyId();

    const clientList = await db
      .select({
        id: customers.id,
        name: customers.name,
        tax_id: customers.tax_id,
        email: customers.email,
        address: customers.address,
      })
      .from(customers)
      .where(eq(customers.company_id, companyId))
      .orderBy(customers.name);

    return { success: true, customers: clientList };
  } catch (error: any) {
    console.error("❌ ERROR AL OBTENER CLIENTES:", error);
    return { success: false, customers: [] };
  }
}

// ============================================================
// PDF EN SERVIDOR — descarga / adjunto de una factura guardada
// ============================================================

/**
 * Genera el PDF de una factura GUARDADA de la empresa activa y lo devuelve
 * en base64. Verifica que la factura pertenezca a una empresa del usuario.
 * Lo usan la descarga desde el modal y el adjunto del email.
 */
export async function getInvoicePdfBase64Action(invoiceId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (!inv) throw new Error("Factura no encontrada");

    // El usuario debe pertenecer a la empresa de la factura.
    const userCompanies = await getUserCompanies();
    const company = userCompanies.find((c) => c.id === inv.company_id);
    if (!company) {
      throw new Error("No tienes acceso a esta factura");
    }

    const [lines, customer, settings] = await Promise.all([
      db
        .select()
        .from(invoice_lines)
        .where(eq(invoice_lines.invoice_id, invoiceId))
        .orderBy(invoice_lines.line_index),
      inv.customer_id
        ? db
            .select()
            .from(customers)
            .where(eq(customers.id, inv.customer_id))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db
        .select()
        .from(company_settings)
        .where(eq(company_settings.company_id, inv.company_id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    const buffer = await renderInvoicePdfBuffer({
      factura: {
        id: inv.id,
        formatted_number: inv.formatted_number,
        series_code: inv.series_code,
        issued_at: inv.issued_at,
        due_date: inv.due_date,
        rectifies_invoice_id: inv.rectifies_invoice_id,
        rectification_reason: inv.rectification_reason,
        client_name: customer?.name,
        client_tax_id: customer?.tax_id,
        client_address: customer?.address,
        subtotal_cents: inv.subtotal_cents,
        vat_total_cents: inv.vat_total_cents,
        total_cents: inv.total_cents,
        qr_code_url: inv.qr_code_url,
        lines,
      },
      empresa: { name: company.name, tax_id: company.tax_id, address: company.address },
      settings,
    });

    return {
      success: true,
      pdfBase64: buffer.toString("base64"),
      filename: `Factura_${inv.formatted_number}.pdf`,
    };
  } catch (error: any) {
    console.error("❌ ERROR GENERANDO PDF:", error);
    return { success: false, error: error?.message || "Error al generar el PDF." };
  }
}