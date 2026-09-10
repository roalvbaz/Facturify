import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import EmpresasManager from '@/components/empresasManager';

export const dynamic = 'force-dynamic';

// Fuera del layout (dashboard) a propósito: aquí llegan los usuarios nuevos
// sin ninguna empresa para crear la primera (onboarding). Si viviéramos dentro
// del layout del dashboard, su redirect() a /empresas cuando no hay empresas
// provocaría un bucle infinito de redirecciones y la página nunca se mostraría.
//
// Para que "Mis Empresas" NO pierda el sidebar cuando el usuario ya tiene
// empresas, esta página renderiza el mismo DashboardShell (sidebar incluido)
// solo en ese caso. El onboarding (sin empresas) se muestra standalone, sin
// sidebar, porque todavía no hay ninguna empresa como contexto.
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

  const empresaContent = (
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

  // El sidebar lo renderiza el layout de /empresas (igual que el layout del
  // dashboard), tanto en onboarding como cuando ya hay empresas. Esta página
  // solo pinta el contenido, para no duplicar el sidebar.
  return empresaContent;
}