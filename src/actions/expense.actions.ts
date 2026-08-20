'use server';

import { db } from '@/db';
import { expenses, companies, company_members } from '@/db/schema';
import { eq, and, desc, gte, lte, ilike, or } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createExpenseAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');

    const [membresia] = await db
      .select({ companyId: company_members.company_id })
      .from(company_members)
      .where(eq(company_members.user_id, user.id))
      .limit(1);

    if (!membresia) throw new Error('Empresa no encontrada');

    const supplier_name = (formData.get('supplier_name') as string)?.trim();
    const supplier_tax_id = (formData.get('supplier_tax_id') as string)?.trim() || null;
    const invoice_reference = (formData.get('invoice_reference') as string)?.trim() || null;
    const expense_date_str = formData.get('expense_date') as string;
    const category = (formData.get('category') as string) || 'General';
    const description = (formData.get('description') as string)?.trim() || null;
    const payment_method = (formData.get('payment_method') as string) || 'TRANSFERENCIA';
    const status = (formData.get('status') as string) || 'Pagado';

    const subtotal = parseFloat(formData.get('subtotal') as string) || 0;
    const vat_percent = parseFloat(formData.get('vat_percent') as string) || 21;
    const irpf_percent = parseFloat(formData.get('irpf_percent') as string) || 0;

    if (!supplier_name) throw new Error('El nombre del proveedor es obligatorio');
    if (subtotal <= 0) throw new Error('La base imponible debe ser mayor que 0');

    const subtotal_cents = Math.round(subtotal * 100);
    const vat_amount_cents = Math.round(subtotal_cents * (vat_percent / 100));
    const irpf_amount_cents = Math.round(subtotal_cents * (irpf_percent / 100));
    const total_cents = subtotal_cents + vat_amount_cents - irpf_amount_cents;

    // Subida opcional de archivo/ticket a Supabase Storage
    let receipt_url: string | null = null;
    const receiptFile = formData.get('receipt') as File | null;
    if (receiptFile && receiptFile.size > 0) {
      const ext = receiptFile.name.split('.').pop();
      const filename = `${membresia.companyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filename, receiptFile, { contentType: receiptFile.type });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filename);
        receipt_url = publicUrlData?.publicUrl || null;
      }
    }

    const expense_date = expense_date_str ? new Date(expense_date_str) : new Date();

    await db.insert(expenses).values({
      company_id: membresia.companyId,
      supplier_name,
      supplier_tax_id,
      invoice_reference,
      expense_date,
      category,
      description,
      subtotal_cents,
      vat_percent: vat_percent.toString(),
      vat_amount_cents,
      irpf_percent: irpf_percent.toString(),
      irpf_amount_cents,
      total_cents,
      payment_method,
      status,
      receipt_url,
    });

    revalidatePath('/gastos');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al registrar el gasto' };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');

    await db.delete(expenses).where(eq(expenses.id, id));

    revalidatePath('/gastos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el gasto' };
  }
}