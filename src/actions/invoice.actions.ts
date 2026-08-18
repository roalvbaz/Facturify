'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db/index';
import {
  companies,
  company_members, // <-- ¡Importamos tu tabla de seguridad!
  invoice_series,
  invoices,
  invoice_lines,
  audit_logs,
} from '@/db/schema';
import { buildCanonicalString } from '@/lib/verifactu/canonical';
import { generateInvoiceHash } from '@/lib/verifactu/crypto';
import { construirUrlQr } from '@/lib/verifactu/qr';
import { EmitInvoiceSchema } from '@/lib/validations/invoice';
import { createClient } from '@/lib/supabase/server'; // <-- Importamos Supabase

export async function emitInvoiceAction(inputData: unknown) {
  try {
    console.log("--> ENTRADA REAL RECIBIDA:", JSON.stringify(inputData, null, 2));

    // A. IDENTIFICACIÓN SEGURA DEL USUARIO (Nuevo Escudo)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado. Debes iniciar sesión.");
    }

    const membresia = await db
      .select({ companyId: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    const activeCompanyId = membresia[0]?.companyId;

    if (!activeCompanyId) {
      throw new Error("Tu usuario no tiene ninguna empresa asignada para emitir facturas.");
    }

    // B. Validamos la entrada con Zod
    const parseResult = EmitInvoiceSchema.safeParse(inputData);
    if (!parseResult.success) {
      throw new Error(`Datos inválidos: ${JSON.stringify(parseResult.error.format(), null, 2)}`);
    }
    
    const data = parseResult.data;
    const currentYear = new Date().getFullYear();

    // C. ABRIMOS LA TRANSACCIÓN
    return await db.transaction(async (tx) => {
      
      // 1. Rescatamos y bloqueamos la serie usando el ID REAL (activeCompanyId)
      let [currentSeries] = await tx
        .select()
        .from(invoice_series)
        .where(
          and(
            eq(invoice_series.company_id, activeCompanyId), // <-- Usamos activeCompanyId
            eq(invoice_series.series_code, data.seriesCode),
            eq(invoice_series.year, currentYear)
          )
        )
        .for('update');

      if (!currentSeries) {
        [currentSeries] = await tx
          .insert(invoice_series)
          .values({
            company_id: activeCompanyId, // <-- Usamos activeCompanyId
            series_code: data.seriesCode,
            year: currentYear,
            last_number: 0,
            last_hash: "",
          })
          .returning();
      }

      // 2. Numeración y encadenamiento
      const newNumber = currentSeries.last_number + 1;
      const paddedNumber = newNumber.toString().padStart(4, '0');
      const formattedInvoiceNumber = `${currentSeries.series_code}-${currentYear}-${paddedNumber}`;
      const prevHash = currentSeries.last_hash ?? "";

      // 3. Aritmética de totales
      let acumulado_subtotal_centimos = 0;
      let acumulado_iva_centimos = 0;
      const lineas_procesadas = [];

      for (const linea of data.lines) {
        const base_linea_centimos = linea.quantity * linea.unitPriceCents;
        const iva_linea_centimos = Math.round((base_linea_centimos * linea.vatPercent) / 100);
        const total_linea_centimos = base_linea_centimos + iva_linea_centimos;

        acumulado_subtotal_centimos += base_linea_centimos;
        acumulado_iva_centimos += iva_linea_centimos;

        lineas_procesadas.push({
          description: linea.description,
          quantity: linea.quantity,
          unitPriceCents: linea.unitPriceCents,
          vatPercent: linea.vatPercent,
          baseCents: base_linea_centimos,
          vatCents: iva_linea_centimos,
          totalCents: total_linea_centimos,
        });
      }

      const total_factura_centimos = acumulado_subtotal_centimos + acumulado_iva_centimos;
        
      // 4. Core Criptográfico
      const [issuer] = await tx
        .select()
        .from(companies)
        .where(eq(companies.id, activeCompanyId)) // <-- Usamos activeCompanyId
        .limit(1);

      if (!issuer) {
        throw new Error("La empresa emisora no existe en la base de datos.");
      }

      const issuedAt = new Date().toISOString().split('T')[0];

      const canonicalString = buildCanonicalString({
        taxId: issuer.tax_id,
        formattedNumber: formattedInvoiceNumber,
        issueDate: issuedAt,
        totalCents: total_factura_centimos,
        prevHash: prevHash,
      });

      const currentHash = await generateInvoiceHash(canonicalString);

      const qrUrl = construirUrlQr({
        emisorNif: issuer.tax_id,
        numeroFactura: formattedInvoiceNumber,
        totalCentimos: total_factura_centimos,
        fechaExpedicion: issuedAt,
      });  
    
      // 5. Persistencia atómica
      const [nuevaFactura] = await tx.insert(invoices).values({
          company_id: activeCompanyId, // <-- Usamos activeCompanyId
          customer_id: data.customerId ?? null,
          series_code: data.seriesCode,
          year: currentYear,
          number: newNumber,
          formatted_number: formattedInvoiceNumber,
          subtotal_cents: acumulado_subtotal_centimos,
          vat_total_cents: acumulado_iva_centimos,
          total_cents: total_factura_centimos,
          prev_hash: prevHash,
          current_hash: currentHash,
          qr_code_url: qrUrl,
          issued_at: new Date(),
          // due_date: new Date(data.dueDate), // ¡Descomenta esto cuando añadas la columna!
      })
      .returning();

      await tx.insert(invoice_lines).values(
        lineas_procesadas.map((linea, idx) => ({
          invoice_id: nuevaFactura.id,
          line_index: idx,
          description: linea.description,
          quantity: linea.quantity.toString(),
          unit_price_cents: linea.unitPriceCents,
          vat_percent: linea.vatPercent.toString(),
          vat_amount_cents: linea.vatCents,
          total_amount_cents: linea.totalCents,
          created_at: new Date(),
        }))
      );

      await tx
        .update(invoice_series)
        .set({
          last_number: newNumber,
          last_hash: currentHash,
          created_at: new Date(),
        })
        .where(eq(invoice_series.id, currentSeries.id));
      
      await tx.insert(audit_logs).values({
        event_code: "EMIT_INVOICE",
        description: `Factura ${formattedInvoiceNumber} emitida con éxito.`,
        timestamp: new Date(),
      });
    
      return { success: true, invoice: nuevaFactura, qrUrl };
    });

    } catch (err: any) {
    console.error("❌ ERROR CRÍTICO EN SERVER ACTION:", err);
    throw new Error(err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }
}