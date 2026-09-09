import Link from 'next/link';
import Image from 'next/image';
import { getInvitationByToken } from '@/lib/invitations';
import RegisterForm from '@/components/registerForm';

export const dynamic = 'force-dynamic';

function StatusCard({
  title,
  error,
  note,
  children,
}: {
  title: string;
  error: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
      <div className="card login-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Image src="/img/banner.png" alt="FacturON Logo" width={280} height={65} priority style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>{title}</h1>
        </div>

        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center', fontWeight: 600 }}>
          {error}
          {note && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 500 }}>{note}</div>
          )}
        </div>

        {children}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
            &larr; Ir al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const token = (invite || '').trim();

  if (!token) {
    return (
      <StatusCard title="Enlace no válido" error="Falta el enlace de invitación.">
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Necesitas un enlace de registro para entrar. Si has pedido acceso a FacturON,
          te lo enviaremos por correo.
        </p>
      </StatusCard>
    );
  }

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <StatusCard title="Enlace no válido" error="Este enlace de registro no es válido o no existe.">
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Comprueba que has copiado bien el enlace completo del correo.
        </p>
      </StatusCard>
    );
  }

  if (invitation.status !== 'ENVIADA') {
    return (
      <StatusCard title="Invitación ya utilizada" error="Esta invitación ya se ha utilizado.">
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Si ya creaste tu cuenta, inicia sesión. Si crees que es un error,
          escríbenos a <a href="mailto:soporte.facturon@gmail.com" style={{ color: 'var(--primary)' }}>soporte.facturon@gmail.com</a>.
        </p>
      </StatusCard>
    );
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return (
      <StatusCard title="Enlace caducado" error="El enlace de registro ha caducado.">
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Los enlaces caducan a los 7 días. Escríbenos a{' '}
          <a href="mailto:soporte.facturon@gmail.com" style={{ color: 'var(--primary)' }}>
            soporte.facturon@gmail.com
          </a>{' '}
          y te enviaremos uno nuevo.
        </p>
      </StatusCard>
    );
  }

  return (
    <RegisterForm
      token={token}
      email={invitation.email}
      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
    />
  );
}