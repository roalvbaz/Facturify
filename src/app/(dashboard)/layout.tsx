import Sidebar from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';
import { getUserCompanies, getActiveCompanyId } from '@/actions/company.actions';
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* Pasamos los datos como props al Sidebar de Cliente */}
      <Sidebar
        companies={companies}
        activeCompanyId={activeCompanyId}
        nombreEmpresa={nombreEmpresa}
        emailUsuario={user.email || 'Usuario'}
      />
      <main style={{ flexGrow: 1, padding: '2rem', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
