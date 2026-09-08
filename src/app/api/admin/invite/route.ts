import { NextRequest, NextResponse } from 'next/server';
import { InviteSchema } from '@/lib/validations/invoice';
import { createInvitation } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

/**
 * Crea una invitación de registro SOLO con el email y envía el enlace
 * a la página pública de registro (/registro?invite=...).
 *
 * Llamado por el backend de la web de marketing:
 *   POST {SITE_URL}/api/admin/invite
 *   Headers: Content-Type: application/json
 *            x-admin-secret: <ADMIN_INVITE_SECRET>
 *   Body:    { "email": "cliente@empresa.com" }
 *
 * Flujo del usuario invitado:
 *   clic en el enlace → /registro → crea su perfil (nombre + contraseña)
 *   → entra en la app → /empresas (onboarding) → crea su empresa.
 */
export async function POST(request: NextRequest) {
  // 1. Guard de seguridad: secreto compartido con el backend que llama
  const configuredSecret = process.env.ADMIN_INVITE_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'ADMIN_INVITE_SECRET no está configurado en el servidor.' },
      { status: 500 }
    );
  }

  const suppliedSecret =
    request.headers.get('x-admin-secret') ||
    (request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null);

  if (!suppliedSecret || suppliedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 2. Validar el cuerpo
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Email inválido', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  const result = await createInvitation({ email, createdBy: null, sendEmail: true });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    emailSent: result.emailSent,
    ...(result.emailSent ? {} : { emailError: result.emailError }),
  });
}