import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { eq } from 'drizzle-orm';
import { RegisterRequestSchema } from '@/lib/validations/invoice';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInvitationByToken } from '@/lib/invitations';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Registro autogestionado: llega con el token de la invitación (?invite=...)
 * y crea/activa la cuenta del invitado:
 *   1. Verifica reCAPTCHA (protección anti-bots).
 *   2. Valida el token: existencia, uso único y caducidad.
 *   3. Fija la contraseña y el nombre de perfil en Supabase Auth (admin).
 *   4. Marca la invitación como REGISTRADA.
 *   5. Inicia sesión y devuelve las cookies de sesión.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = RegisterRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.issues },
        { status: 400 }
      );
    }

    const { token, fullName, password, recaptchaToken } = result.data;

    // 1. Anti-bots
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json(
        { error: 'Verificación de reCAPTCHA fallida. Por favor, inténtalo de nuevo.' },
        { status: 400 }
      );
    }

    // 2. Token válido, de un solo uso y sin caducar
    const invitation = await getInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Este enlace de registro no es válido.' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'ENVIADA') {
      return NextResponse.json(
        { error: 'Esta invitación ya se ha utilizado.' },
        { status: 409 }
      );
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'El enlace de registro ha caducado. Pide un enlace nuevo.' },
        { status: 410 }
      );
    }

    // 3. Activar la cuenta: contraseña + perfil (nombre)
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      invitation.user_id,
      {
        password,
        user_metadata: { full_name: fullName },
      }
    );

    if (updateError) {
      console.error('❌ Error activando cuenta del invitado:', updateError);
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta. Inténtalo de nuevo o contacta con soporte.' },
        { status: 500 }
      );
    }

    // 4. Consumir la invitación (un solo uso)
    try {
      await db
        .update(invitations)
        .set({ status: 'REGISTRADA', responded_at: new Date() })
        .where(eq(invitations.id, invitation.id));
    } catch (updateErr) {
      console.error('⚠️ Error actualizando estado de invitación:', updateErr);
      // No devolvemos error: la cuenta ya está creada y la contraseña fijada.
    }

    // 5. Iniciar sesión y devolver las cookies de sesión
    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password,
    });

    if (signInError) {
      // La contraseña se fijó pero no podemos darle sesión: que inicie sesión manualmente.
      return NextResponse.json({
        success: true,
        requiresLogin: true,
        message: 'Cuenta creada. Inicia sesión para continuar.',
      });
    }

    // Registrar en auditoría (no crítico: si falla, no rompemos el registro)
    await logAuditEvent({
      eventCode: 'USER_REGISTERED',
      description: `El usuario ${invitation.email} completó su registro a través de la invitación`,
      userId: signInData.user.id,
    });

    const finalResponse = NextResponse.json({ success: true });

    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return finalResponse;
  } catch (error) {
    console.error('Error interno en /api/auth/register:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}