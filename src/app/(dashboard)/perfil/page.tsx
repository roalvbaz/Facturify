import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profileForm';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const fullName = (user.user_metadata as any)?.full_name || '';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
          Mi Perfil
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Tu información personal de acceso a FacturON.
        </p>
      </div>

      <ProfileForm email={user.email || ''} fullName={fullName} />
    </div>
  );
}