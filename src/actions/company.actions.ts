"use server";

import { db } from "@/db";
import { companies, company_members, company_settings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getActiveCompanyId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [member] = await db
    .select()
    .from(company_members)
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  if (!member) throw new Error("Empresa no encontrada");
  return member.company_id;
}

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