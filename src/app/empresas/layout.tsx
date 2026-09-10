import Sidebar from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import { isAdminUser } from '@/lib/invitations';
import { redirect } from 'next/navigation';

export default async function EmpresasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const companies = await getUserCompanies();

  // Si no tiene empresas, mostramos la página sin sidebar (onboarding puro)
  if (companies.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    );
  }

  // Si tiene empresas, mostramos con sidebar
  let activeCompanyId: string | null = null;
  try {
    activeCompanyId = await getActiveCompanyId();
  } catch {
    activeCompanyId = companies[0]?.id || null;
  }

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const nombreEmpresa = activeCompany?.name || 'Empresa no asignada';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)', transition: 'background-color 0.2s ease' }}>
      <Sidebar
        companies={companies}
        activeCompanyId={activeCompanyId || ''}
        nombreEmpresa={nombreEmpresa}
        emailUsuario={user.email || 'Usuario'}
        isAdmin={isAdminUser(user.email)}
      />
      <main style={{ flexGrow: 1, padding: '2rem', height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
        {children}
      </main>
    </div>
  );
}
