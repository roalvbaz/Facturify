import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq, desc, and, gte, lte, ilike, or } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import ExpensesClientView from '@/components/expensesClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; from?: string; to?: string }>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const userCompanies = await getUserCompanies();
  const activeCompanyId = await getActiveCompanyId();
  const miEmpresa = userCompanies.find((c) => c.id === activeCompanyId);

  if (!miEmpresa) {
    redirect('/empresas');
  }

  const busqueda = resolvedParams.q || '';
  const categoria = resolvedParams.category || 'Todas';
  const from = resolvedParams.from || '';
  const to = resolvedParams.to || '';

  const conditions = [eq(expenses.company_id, activeCompanyId)];

  if (busqueda.trim()) {
    const term = `%${busqueda.trim()}%`;
    conditions.push(or(ilike(expenses.supplier_name, term), ilike(expenses.description, term))!);
  }
  if (categoria !== 'Todas') {
    conditions.push(eq(expenses.category, categoria));
  }
  if (from) conditions.push(gte(expenses.expense_date, new Date(`${from}T00:00:00`)));
  if (to) conditions.push(lte(expenses.expense_date, new Date(`${to}T23:59:59.999`)));

  const listaGastos = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expense_date));

  // Totales fiscales
  const totalBase = listaGastos.reduce((acc, g) => acc + g.subtotal_cents, 0) / 100;
  const totalIva = listaGastos.reduce((acc, g) => acc + g.vat_amount_cents, 0) / 100;
  const totalGasto = listaGastos.reduce((acc, g) => acc + g.total_cents, 0) / 100;

  return (
    <ExpensesClientView
      gastos={listaGastos}
      companyName={miEmpresa.name}
      stats={{ totalBase, totalIva, totalGasto, count: listaGastos.length }}
      filtros={{ busqueda, categoria, from, to }}
    />
  );
}