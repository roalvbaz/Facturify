import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { invoices, company_members, customers } from "@/db/schema";
import { eq, and, ilike, gte, lte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const [member] = await db
      .select({ company_id: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!member) {
      return new NextResponse("Empresa no encontrada", { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const busqueda = searchParams.get("q") || "";
    const estado = searchParams.get("status") || "Todas";
    const fechaDesde = searchParams.get("from") || "";
    const fechaHasta = searchParams.get("to") || "";

    const conditions = [eq(invoices.company_id, member.company_id)];

    if (busqueda.trim()) {
      conditions.push(ilike(invoices.formatted_number, `%${busqueda.trim()}%`));
    }
    if (estado !== "Todas") {
      conditions.push(eq((invoices as any).status, estado));
    }
    if (fechaDesde) {
      conditions.push(gte(invoices.issued_at, new Date(`${fechaDesde}T00:00:00`)));
    }
    if (fechaHasta) {
      conditions.push(lte(invoices.issued_at, new Date(`${fechaHasta}T23:59:59.999`)));
    }

    const facturas = await db
      .select({
        formatted_number: invoices.formatted_number,
        issued_at: invoices.issued_at,
        due_date: (invoices as any).due_date,
        status: (invoices as any).status,
        subtotal_cents: invoices.subtotal_cents,
        vat_total_cents: invoices.vat_total_cents,
        total_cents: invoices.total_cents,
        current_hash: invoices.current_hash,
        client_name: customers.name,
        client_tax_id: customers.tax_id,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customer_id, customers.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.issued_at));

    // Cabecera CSV en formato Libro Registro de Facturas Expedidas
    const headers = [
      "Numero Factura",
      "Fecha Emision",
      "Fecha Vencimiento",
      "Cliente",
      "NIF Cliente",
      "Base Imponible (€)",
      "Cuota IVA (€)",
      "Total Factura (€)",
      "Estado",
      "Huella Verifactu (SHA-256)",
    ];

    const rows = facturas.map((f) => {
      const fechaEmision = f.issued_at ? new Date(f.issued_at).toLocaleDateString("es-ES") : "";
      const fechaVencimiento = f.due_date ? new Date(f.due_date).toLocaleDateString("es-ES") : "";
      const base = ((f.subtotal_cents || 0) / 100).toFixed(2).replace(".", ",");
      const iva = ((f.vat_total_cents || 0) / 100).toFixed(2).replace(".", ",");
      const total = ((f.total_cents || 0) / 100).toFixed(2).replace(".", ",");

      return [
        `"${f.formatted_number || ""}"`,
        `"${fechaEmision}"`,
        `"${fechaVencimiento}"`,
        `"${(f.client_name || "").replace(/"/g, '""')}"`,
        `"${f.client_tax_id || ""}"`,
        `"${base}"`,
        `"${iva}"`,
        `"${total}"`,
        `"${f.status || "Pendiente"}"`,
        `"${f.current_hash || ""}"`,
      ].join(";");
    });

    // UTF-8 BOM para que Excel en Windows y Mac reconozca tildes y caracteres especiales
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");

    const filename = `Libro_Facturas_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Error al generar exportación", { status: 500 });
  }
}