import { cookies } from 'next/headers';
import { db } from '@/db'; // Ajusta la ruta de tu cliente Drizzle
import { companies, company_members } from '@/db/schema'; // Ajusta la ruta de tus schemas
import { eq } from 'drizzle-orm';

// Obtener todas las empresas del usuario actual
export async function getUserCompanies(userId: string) {
  const result = await db
    .select({
      id: companies.id,
      name: companies.name,
      tax_id: companies.tax_id,
      role: company_members.role,
    })
    .from(company_members)
    .innerJoin(companies, eq(company_members.company_id, companies.id))
    .where(eq(company_members.user_id, userId));

  return result;
}

// Obtener el ID de la empresa activa actual desde las cookies
export async function getActiveCompanyId(): Promise<string> {
  const cookieStore = await cookies();
  const activeCompany = cookieStore.get('active_company_id')?.value;

  if (!activeCompany) {
    throw new Error('No hay ninguna empresa seleccionada actualmente.');
  }

  return activeCompany;
}