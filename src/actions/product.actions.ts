"use server";

import { db } from "@/db";
import { products, company_members } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getActiveCompanyId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("No autenticado");
  }

  // Consulta directa sin depender de db.query
  const [member] = await db
    .select()
    .from(company_members) // o companyMembers según como lo tengas importado de @/db/schema
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  if (!member) {
    throw new Error("Empresa no encontrada para el usuario activo");
  }

  return member.company_id;
}
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

    revalidatePath("/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar producto" };
  }
}