"use server";

import { db } from "@/db";
import { companies, company_members, company_settings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// 1. Obtener todas las empresas del usuario actual
export async function getUserCompanies() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const userCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      tax_id: companies.tax_id,
      role: company_members.role,
    })
    .from(company_members)
    .innerJoin(companies, eq(company_members.company_id, companies.id))
    .where(eq(company_members.user_id, user.id));

  return userCompanies;
}

// 2. Obtener el ID de la empresa activa actual (respetando la cookie y validando pertenencia)
export async function getActiveCompanyId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const cookieStore = await cookies();
  const activeCompanyIdCookie = cookieStore.get("active_company_id")?.value;

  // Obtener todas las empresas del usuario
  const userCompanies = await getUserCompanies();
  if (userCompanies.length === 0) throw new Error("No tienes ninguna empresa asignada");

  // Si hay una cookie activa, comprobamos que el usuario pertenezca realmente a ella
  if (activeCompanyIdCookie) {
    const isValid = userCompanies.some((c) => c.id === activeCompanyIdCookie);
    if (isValid) {
      return activeCompanyIdCookie;
    }
  }

  // Por defecto, si no hay cookie o no es válida, devolvemos la primera
  return userCompanies[0].id;
}

// 3. Server action para cambiar la empresa activa desde el selector
export async function setActiveCompanyAction(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Validar que el usuario pertenece a esta empresa por seguridad
  const [membership] = await db
    .select()
    .from(company_members)
    .where(
      and(
        eq(company_members.user_id, user.id),
        eq(company_members.company_id, companyId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("No tienes permisos para acceder a esta empresa");
  }

  const cookieStore = await cookies();
  cookieStore.set("active_company_id", companyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 año
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  revalidatePath("/(dashboard)", "layout");
}

// 4. Tu función original de actualizar configuración (ahora usa el nuevo getActiveCompanyId)
export async function updateCompanySettingsAction(formData: FormData) {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();

    const name = (formData.get("name") as string)?.trim();
    const tax_id = (formData.get("tax_id") as string)?.trim();
    const address = (formData.get("address") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const postal_code = (formData.get("postal_code") as string)?.trim() || null;

    const theme_color = (formData.get("theme_color") as string)?.trim() || "#4f46e5";
    
    const logoFile = formData.get("logo_file") as File | null;
    let logo_url = (formData.get("current_logo_url") as string) || null;

    if (!name || !tax_id) {
      return { success: false, error: "El Nombre y NIF son obligatorios" };
    }

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${companyId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) {
        throw new Error("Error al subir el logotipo: " + uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);

      logo_url = publicUrlData.publicUrl;
    }

    await db
      .update(companies)
      .set({ name, tax_id, address, city, postal_code })
      .where(eq(companies.id, companyId));

    await db
      .insert(company_settings)
      .values({ company_id: companyId, theme_color, logo_url, updated_at: new Date() })
      .onConflictDoUpdate({
        target: company_settings.company_id,
        set: { theme_color, logo_url, updated_at: new Date() },
      });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");
    revalidatePath("/historial");
    revalidatePath("/nueva-factura");
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al actualizar configuración" };
  }
}