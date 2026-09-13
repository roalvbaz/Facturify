"use server";

import { db } from "@/db";
import { companies, company_members, company_settings, audit_logs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { encryptSecret, decryptSecret } from "@/lib/verifactu/cipher";
import { parsePfx, isCertificateValid } from "@/lib/verifactu/certificate";

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
      address: companies.address,
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

// 2c. Obtener la configuración visual de la empresa activa (template_id, theme_color, logo_url)
export async function getActiveCompanySettings() {
  const companyId = await getActiveCompanyId();
  const [settings] = await db
    .select()
    .from(company_settings)
    .where(eq(company_settings.company_id, companyId))
    .limit(1);
  return settings || null;
}

// 2b. Server action para crear una NUEVA empresa y asociarla al usuario como OWNER
export async function createCompanyAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const name = (formData.get("name") as string)?.trim();
    const tax_id = (formData.get("tax_id") as string)?.trim();
    const address = (formData.get("address") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const postal_code = (formData.get("postal_code") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "El Nombre de la empresa es obligatorio" };
    }
    if (!tax_id) {
      return { success: false, error: "El NIF/CIF es obligatorio" };
    }

    // Insertamos la empresa + membresía OWNER + ajustes visuales de forma atómica
    const [nuevaEmpresa] = await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({ name, tax_id, address, city, postal_code })
        .returning({ id: companies.id });

      await tx.insert(company_members).values({
        company_id: company.id,
        user_id: user.id,
        role: "OWNER",
      });

      await tx.insert(company_settings).values({
        company_id: company.id,
        theme_color: "#4f46e5",
        template_id: "clasico-tradicional",
      });

      return [company];
    });

    // La nueva empresa pasa a ser la activa
    const cookieStore = await cookies();
    cookieStore.set("active_company_id", nuevaEmpresa.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Audit log de creación
    await logAuditEvent({
      eventCode: "COMPANY_CREATED",
      description: `Creación de la empresa ${name} (${tax_id})`,
      companyId: nuevaEmpresa.id,
      userId: user.id,
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/empresas");

    return { success: true, companyId: nuevaEmpresa.id };
  } catch (err: any) {
    // Código 23505 = violación de unicidad (tax_id duplicado)
    if (err?.code === "23505") {
      return { success: false, error: "Ya existe una empresa con ese NIF/CIF." };
    }
    return { success: false, error: err?.message || "Error al crear la empresa" };
  }
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

  await logAuditEvent({
    eventCode: "COMPANY_ACTIVE_CHANGED",
    description: `Cambio de empresa activa`,
    companyId,
    userId: user.id,
    metadata: { companyId },
  });

  revalidatePath("/(dashboard)", "layout");
}

// 4. Tu función original de actualizar configuración (ahora usa el nuevo getActiveCompanyId)
export async function updateCompanySettingsAction(formData: FormData) {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();

    // AÑADIDO PARA EL AUDIT LOG: Sacamos el user para saber quién hizo el cambio
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

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

    // 🕵️ AUDIT LOG: modificación de configuración de la empresa
    await logAuditEvent({
      eventCode: 'COMPANY_SETTINGS_UPDATED',
      description: 'Modificación de configuración fiscal, NIF o logotipo de la empresa',
      companyId,
      userId: user.id,
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");
    revalidatePath("/historial");
    revalidatePath("/nueva");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al actualizar configuración" };
  }
}

// 5. Guardar la plantilla de factura seleccionada para la empresa activa
export async function updateTemplateAction(templateId: string) {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    await db
      .insert(company_settings)
      .values({ company_id: companyId, template_id: templateId, updated_at: new Date() })
      .onConflictDoUpdate({
        target: company_settings.company_id,
        set: { template_id: templateId, updated_at: new Date() },
      });

    await db.insert(audit_logs).values({
      company_id: companyId,
      user_id: user.id,
      event_code: 'TEMPLATE_UPDATE',
      description: `Cambio de plantilla de factura a: ${templateId}`,
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");
    revalidatePath("/nuevoPresupuesto");
    revalidatePath("/historial");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al guardar la plantilla" };
  }
}

// ============================================================
// CERTIFICADO DIGITAL Veri*factu (cada empresa sube el suyo)
// ============================================================

/**
 * Guarda (o sustituye) el certificado PFX de la empresa activa.
 * Los datos sensibles se cifran con AES-256-GCM antes de persistir.
 *
 * Se valida el PFX "en seco" (parseo + comprobación de validez) ANTES de
 * guardarlo, para no persistir certificados corruptos o caducados.
 */
export async function saveCompanyCertificateAction(formData: FormData) {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const pfxFile = formData.get("pfx_file") as File | null;
    const password = (formData.get("pfx_password") as string)?.trim() || "";
    const environment = (formData.get("aeat_environment") as string)?.trim() || "sandbox";
    if (environment !== "sandbox" && environment !== "production") {
      throw new Error("El entorno AEAT debe ser 'sandbox' o 'production'.");
    }

    if (!pfxFile) {
      throw new Error("Selecciona un archivo de certificado (.pfx / .p12).");
    }
    if (pfxFile.size > 3 * 1024 * 1024) {
      throw new Error("El certificado no puede superar 3 MB.");
    }
    if (!password) {
      throw new Error("La contraseña del PFX es obligatoria.");
    }

    const buffer = Buffer.from(await pfxFile.arrayBuffer());
    const pfxBase64 = buffer.toString("base64");

    // Validación en seco: parsea y comprueba vigencia
    let parsed;
    try {
      parsed = parsePfx({ pfxBase64, password });
    } catch (err: any) {
      return {
        success: false,
        error: `Certificado inválido: ${err?.message || "no se pudo leer"}`,
      };
    }

    const now = new Date();
    if (!isCertificateValid(parsed, now)) {
      return {
        success: false,
        error: `El certificado está ${now < parsed.validFrom ? "aún no válido" : "caducado"} ` +
          `(validez: ${parsed.validFrom.toISOString().slice(0, 10)} → ${parsed.validTo.toISOString().slice(0, 10)}).`,
      };
    }

    // Cifrado y persistencia
    const encPfx = encryptSecret(pfxBase64);
    const encPassword = encryptSecret(password);

    await db
      .insert(company_settings)
      .values({
        company_id: companyId,
        aeat_pfx_data: encPfx,
        aeat_pfx_password: encPassword,
        aeat_environment: environment,
        aeat_cert_subject: parsed.subject,
        aeat_cert_valid_from: parsed.validFrom,
        aeat_cert_valid_to: parsed.validTo,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: company_settings.company_id,
        set: {
          aeat_pfx_data: encPfx,
          aeat_pfx_password: encPassword,
          aeat_environment: environment,
          aeat_cert_subject: parsed.subject,
          aeat_cert_valid_from: parsed.validFrom,
          aeat_cert_valid_to: parsed.validTo,
          updated_at: new Date(),
        },
      });

    await db.insert(audit_logs).values({
      company_id: companyId,
      user_id: user.id,
      event_code: 'AEAT_CERT_UPLOADED',
      description: `Certificado digital Veri*factu actualizado (entorno ${environment}).`,
      metadata: { cn: parsed.commonName, subject: parsed.subject },
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");

    return {
      success: true,
      certificate: {
        commonName: parsed.commonName,
        issuer: parsed.issuer,
        subject: parsed.subject,
        validFrom: parsed.validFrom.toISOString().slice(0, 10),
        validTo: parsed.validTo.toISOString().slice(0, 10),
        environment,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al guardar el certificado" };
  }
}

/** Elimina el certificado digital de la empresa activa */
export async function removeCompanyCertificateAction() {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    await db
      .update(company_settings)
      .set({
        aeat_pfx_data: null,
        aeat_pfx_password: null,
        aeat_cert_subject: null,
        aeat_cert_valid_from: null,
        aeat_cert_valid_to: null,
        updated_at: new Date(),
      })
      .where(eq(company_settings.company_id, companyId));

    await db.insert(audit_logs).values({
      company_id: companyId,
      user_id: user.id,
      event_code: 'AEAT_CERT_REMOVED',
      description: 'Certificado digital Veri*factu eliminado.',
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar el certificado" };
  }
}

/** Cambia el entorno AEAT (sandbox/producción) sin tocar el certificado almacenado */
export async function updateAeatEnvironmentAction(environment: string) {
  try {
    const companyId = await getActiveCompanyId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const env = (environment || "").trim();
    if (env !== "sandbox" && env !== "production") {
      throw new Error("El entorno AEAT debe ser 'sandbox' o 'production'.");
    }

    await db
      .update(company_settings)
      .set({ aeat_environment: env, updated_at: new Date() })
      .where(eq(company_settings.company_id, companyId));

    await db.insert(audit_logs).values({
      company_id: companyId,
      user_id: user.id,
      event_code: 'AEAT_ENV_CHANGED',
      description: `Entorno AEAT cambiado a ${env}.`,
    });

    revalidatePath("/(dashboard)", "layout");
    revalidatePath("/configuracion");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al cambiar el entorno AEAT" };
  }
}

/**
 * Devuelve la información pública del certificado de la empresa activa
 * (para mostrarlo en Configuración). NUNCA expone el PFX ni su contraseña.
 */
export async function getCompanyCertificateInfoAction() {
  try {
    const [settings] =
      await db
        .select()
        .from(company_settings)
        .where(eq(company_settings.company_id, await getActiveCompanyId()))
        .limit(1);

    if (!settings?.aeat_cert_subject) {
      return { success: true, certificate: null };
    }

    const now = new Date();
    const validFrom = settings.aeat_cert_valid_from ? new Date(settings.aeat_cert_valid_from) : null;
    const validTo = settings.aeat_cert_valid_to ? new Date(settings.aeat_cert_valid_to) : null;

    return {
      success: true,
      certificate: {
        subject: settings.aeat_cert_subject,
        environment: settings.aeat_environment || 'sandbox',
        validFrom: validFrom?.toISOString().slice(0, 10) || null,
        validTo: validTo?.toISOString().slice(0, 10) || null,
        isExpired: validTo ? now > validTo : false,
        isPending: validFrom ? now < validFrom : false,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al consultar el certificado" };
  }
}

/**
 * INTERNO (server-only): recupera el PFX descifrado de una empresa.
 * Lo usan el cliente SOAP y el procesador de cola. No exponer vía server action.
 */
export async function getCompanyCertificateDecrypted(companyId: string): Promise<{
  pfxBase64: string;
  password: string;
  environment: 'sandbox' | 'production';
} | null> {
  const [settings] = await db
    .select()
    .from(company_settings)
    .where(eq(company_settings.company_id, companyId))
    .limit(1);

  if (!settings?.aeat_pfx_data) return null;

  return {
    pfxBase64: decryptSecret(settings.aeat_pfx_data),
    password: settings.aeat_pfx_password ? decryptSecret(settings.aeat_pfx_password) : '',
    environment: (settings.aeat_environment || 'sandbox') as 'sandbox' | 'production',
  };
}