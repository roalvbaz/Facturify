import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminUser, listInvitations } from '@/lib/invitations';
import InvitationsManager from '@/components/invitationsManager';

export const dynamic = 'force-dynamic';

export default async function InvitacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = isAdminUser(user.email);

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 0.75rem 0' }}>
            Acceso restringido
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Solo los administradores de la plataforma pueden gestionar las invitaciones.
          </p>
        </div>
      </div>
    );
  }

  const invitations = await listInvitations();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 2px 0' }}>
          Invitaciones de Registro
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Añade los correos de quienes te han pedido la app y envíales su enlace de registro.
        </p>
      </div>

      <InvitationsManager invitations={invitations} isAdmin={isAdmin} />
    </div>
  );
}