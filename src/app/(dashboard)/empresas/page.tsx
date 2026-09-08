import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import EmpresasManager from '@/components/empresasManager';

export const dynamic = 'force-dynamic';

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const companies = await getUserCompanies();
  let activeCompanyId: string | null = null;
  try {
    activeCompanyId = await getActiveCompanyId();
  } catch {
    activeCompanyId = companies[0]?.id || null;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-color)", margin: "0 0 2px 0" }}>
          Mis Empresas
        </h2>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Administra y crea las empresas que facturan desde tu cuenta.
        </p>
      </div>

      <EmpresasManager
        companies={companies}
        activeCompanyId={activeCompanyId}
        showOnboarding={companies.length === 0}
      />
    </div>
  );
}
