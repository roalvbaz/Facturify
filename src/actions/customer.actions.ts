'use server';

import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveCompanyId } from '@/actions/company.actions';
export async function deleteCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado' };
    }

    const companyId = await getActiveCompanyId();

    await db
      .update(customers)
      .set({ is_active: false })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.company_id, companyId)
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

    const companyId = await getActiveCompanyId();

    const name = (formData.get("name") as string)?.trim();
    const tax_id = (formData.get("tax_id") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "El Nombre o Razón Social es obligatorio" };
    }

    await db.insert(customers).values({
      company_id: companyId,
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