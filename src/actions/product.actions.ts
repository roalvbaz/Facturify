"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getActiveCompanyId } from "@/actions/company.actions";

export async function getCompanyProductsAction(q?: string) {
  try {
    const companyId = await getActiveCompanyId();

    const result = await db
      .select()
      .from(products)
      .where(
        q
          ? and(
              eq(products.company_id, companyId),
              ilike(products.name, `%${q}%`)
            )
          : eq(products.company_id, companyId)
      )
      .orderBy(desc(products.created_at));

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al obtener productos" };
  }
}

export async function createProductAction(formData: FormData) {
  try {
    const companyId = await getActiveCompanyId();

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priceEur = parseFloat((formData.get("price") as string) || "0");
    const defaultVat = parseInt((formData.get("default_vat") as string) || "21", 10);

    if (!name) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    const priceCents = Math.round(priceEur * 100);

    await db.insert(products).values({
      company_id: companyId,
      name,
      description,
      price_cents: priceCents,
      default_vat: defaultVat,
    });

    await logAuditEvent({
      eventCode: 'PRODUCT_CREATED',
      description: `Alta del producto/servicio ${name}`,
      companyId,
      metadata: { name, price_cents: priceCents },
    });

    revalidatePath("/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al crear el producto" };
  }
}

export async function deleteProductAction(id: string) {
  try {
    const companyId = await getActiveCompanyId();

    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.company_id, companyId)));

    await logAuditEvent({
      eventCode: 'PRODUCT_DELETED',
      description: 'Producto/servicio eliminado',
      companyId,
      metadata: { productId: id },
    });

    revalidatePath("/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar producto" };
  }
}