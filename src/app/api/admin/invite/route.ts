import { NextRequest, NextResponse } from 'next/server';
import { InviteSchema } from '@/lib/validations/invoice';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email/email';

export const dynamic = 'force-dynamic';

/**
 * Crea una cuenta de usuario SOLO con el email y envía un enlace de registro.
 *
 * Llamado por el backend de la web de marketing:
 *   POST {SITE_URL}/api/admin/invite
 *   Headers: Content-Type: application/json
 *            x-admin-secret: <ADMIN_INVITE_SECRET>
 *   Body:    { "email": "cliente@empresa.com" }
 *
 * Flujo del usuario invitado:
 *   clic en el enlace → /api/auth/callback → /actualizar-password → fija su contraseña
 *   → inicia sesión → /empresas (onboarding) → crea su empresa.
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

  try {
    const admin = createAdminClient();

    // 3. Crear el usuario solo con el email (sin contraseña)
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createError) {
      const msg = (createError.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('ya registrado')) {
        return NextResponse.json(
          { error: 'Este email ya tiene una cuenta registrada.' },
          { status: 409 }
        );
      }
      throw new Error(createError.message);
    }

    // 4. Generar el enlace de recuperación (mismo mecanismo que resetPasswordAction)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback?next=/actualizar-password`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || 'No se pudo generar el enlace de registro');
    }

    const setupLink = linkData.properties.action_link;

    // 5. Enviar el email de bienvenida con el enlace
    const mailResult = await sendWelcomeEmail({ to: email, setupLink });

    return NextResponse.json({
      success: true,
      emailSent: mailResult.success,
      ...(mailResult.success ? {} : { emailError: mailResult.error }),
    });
  } catch (error: any) {
    console.error('❌ Error en /api/admin/invite:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al crear la cuenta' },
      { status: 500 }
    );
  }
}
