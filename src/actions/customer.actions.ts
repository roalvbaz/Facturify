'use server';

import { db } from '@/db';
import { customers, company_members, invoices } from '@/db/schema';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * 1. Elimina un cliente asegurando que pertenezca a la empresa del usuario
 */
export async function deleteCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener la empresa del usuario
    const [membresia] = await db
      .select({ companyId: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!membresia) {
      return { success: false, error: 'No tienes una empresa asignada.' };
    }

    // Verificar si el cliente tiene facturas vinculadas
    const facturasAsociadas = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, membresia.companyId),
          eq(invoices.customer_id, customerId)
        )
      )
      .limit(1);

    if (facturasAsociadas.length > 0) {
      return { 
        success: false, 
        error: 'No se puede eliminar el cliente porque tiene facturas emitidas asociadas.' 
      };
    }

    // Eliminar el cliente
    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.company_id, membresia.companyId)
        )
      );

    revalidatePath('/clientes');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar cliente:', error);
    return { success: false, error: error?.message || 'Error al eliminar el cliente.' };
  }
}