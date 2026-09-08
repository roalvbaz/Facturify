import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import EmpresasManager from '@/components/empresasManager';

export const dynamic = 'force-dynamic';

// Fuera del layout (dashboard) a propósito: aquí llegan los usuarios nuevos
// sin ninguna empresa para crear la primera (onboarding). Si viviéramos dentro
// del layout del dashboard, su redirect() a /empresas cuando no hay empresas
// provocaría un bucle infinito de redirecciones y la página nunca se mostraría.
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
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "2rem", paddingTop: "2rem" }}>
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