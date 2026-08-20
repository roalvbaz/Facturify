'use server';

import { db } from '@/db';
import { customers, company_members } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
export async function deleteCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado' };
    }

    const [membresia] = await db
      .select({ companyId: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!membresia) {
      return { success: false, error: 'No tienes una empresa asignada.' };
    }

    await db
      .update(customers)
      .set({ is_active: false })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.company_id, membresia.companyId)
        )
      );

    revalidatePath('/clientes');
    revalidatePath('/nueva-factura');
    return { success: true };
  } catch (error: any) {
    console.error('Error al ocultar cliente:', error);
    return { success: false, error: error?.message || 'Error al eliminar el cliente.' };
  }
}

export async function createCustomerAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const [member] = await db
      .select()
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!member) throw new Error("Empresa no encontrada");

    const name = (formData.get("name") as string)?.trim();
    const tax_id = (formData.get("tax_id") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "El Nombre o Razón Social es obligatorio" };
    }

    await db.insert(customers).values({
      company_id: member.company_id,
      name,
      tax_id,
      email,
      address,
      is_active: true,
    });

    revalidatePath("/clientes");
    revalidatePath("/nueva-factura");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al crear cliente" };
  }
}