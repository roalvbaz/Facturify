import Sidebar from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { companies, company_members } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

  // 2. Buscamos la empresa UNA SOLA VEZ
  let nombreEmpresa = "Empresa no asignada";
  
  const membresia = await db
    .select({ companyName: companies.name })
    .from(company_members)
    .innerJoin(companies, eq(company_members.company_id, companies.id))
    .where(eq(company_members.user_id, user.id))
    .limit(1);

  if (membresia.length > 0) {
    nombreEmpresa = membresia[0].companyName;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* Pasamos los datos como props al Sidebar de Cliente */}
      <Sidebar nombreEmpresa={nombreEmpresa} emailUsuario={user.email || 'Usuario'} />
      <main style={{ flexGrow: 1, padding: '2rem', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}