import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validations/invoice';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { checkRateLimit, peekRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = LoginSchema.safeParse(body);
    
    // 1. Validar datos estrictamente con Zod
    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.issues },
        { status: 400 }
      );
    }

    const { email, password, recaptchaToken } = result.data;

    // 2. Validar reCAPTCHA con Google
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json(
        { error: 'Verificación de reCAPTCHA fallida. Por favor, inténtalo de nuevo.' },
        { status: 400 }
      );
    }

    // 3. Inicializar Supabase para autenticar al usuario
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

    // 3.5 Anti fuerza bruta: máx. 5 intentos fallidos por email en 15 min.
    //    Comprobamos sin incrementar (peek) para no contar el intento actual.
    const rlKey = `login:${email.toLowerCase()}`;
    const rl = await peekRateLimit({
      key: rlKey,
      action: 'LOGIN_FAILED',
      max: 5,
      windowSeconds: 15 * 60,
    });

    if (!rl.allowed) {
      await logAuditEvent({
        eventCode: 'RATE_LIMIT_TRIGGERED',
        description: `Acceso bloqueado del email ${email} por exceso de intentos fallidos`,
        metadata: { email },
        ipAddress: getClientIp(request),
      });
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } }
      );
    }

    // 4. Iniciar sesión en Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Incrementamos el contador de fallidos (solo en fallo).
      const rlNow = await checkRateLimit({
        key: rlKey,
        action: 'LOGIN_FAILED',
        max: 5,
        windowSeconds: 15 * 60,
      });

      await logAuditEvent({
        eventCode: 'USER_LOGIN_FAILED',
        description: `Intento de inicio de sesión fallido para ${email}`,
        metadata: { email, reason: error.message },
        ipAddress: getClientIp(request),
      });

      if (!rlNow.allowed) {
        await logAuditEvent({
          eventCode: 'RATE_LIMIT_TRIGGERED',
          description: `Acceso bloqueado del email ${email} por exceso de intentos fallidos`,
          metadata: { email },
          ipAddress: getClientIp(request),
        });
        return NextResponse.json(
          { error: 'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.' },
          { status: 429, headers: { 'Retry-After': String(rlNow.retryAfterSeconds || 60) } }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 5. GUARDADO SILENCIOSO EN LA CAJA NEGRA (AUDIT LOG) — nunca bloquea el login.
    await logAuditEvent({
      eventCode: 'USER_LOGIN',
      description: 'Inicio de sesión exitoso en el sistema',
      userId: data.user.id,
      ipAddress: getClientIp(request),
    });

    // 6. Devolver respuesta manteniendo las cookies de sesión intactas
    const finalResponse = NextResponse.json({ success: true, user: data.user });
    
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return finalResponse;

  } catch (error) {
    console.error('Error interno en login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}