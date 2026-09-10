import Sidebar from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
import { isAdminUser } from '@/lib/invitations';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Buscamos el usuario UNA SOLA VEZ para todo el panel
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Empresas del usuario (para el selector) y empresa activa
  const companies = await getUserCompanies();

  // Si el usuario aún no tiene ninguna empresa, le llevamos al onboarding
  if (companies.length === 0) {
    redirect('/empresas');
  }

  const activeCompanyId = await getActiveCompanyId();
  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const nombreEmpresa = activeCompany?.name || 'Empresa no asignada';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)', transition: 'background-color 0.2s ease' }}>
      <Sidebar
        companies={companies}
        activeCompanyId={activeCompanyId}
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
