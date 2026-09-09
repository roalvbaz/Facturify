'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendResetPasswordEmail } from '@/lib/email/email';
import { redirect } from 'next/navigation';
import { logAuditEvent } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rateLimit';

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  await supabase.auth.signOut();

  // Registramos ANTES de salir por completo; pasamos el userId explícito
  // porque la sesión ya no existirá cuando se inserte el log.
  await logAuditEvent({
    eventCode: 'USER_SIGNOUT',
    description: 'Cierre de sesión',
    userId,
  });

  redirect('/login');
}

// Enviar código OTP de recuperación con nuestro branding (Nodemailer)
//
// IMPORTANTE: NO usamos `signInWithOtp` a propósito. Ese método dispara el
// correo propio de Supabase (con su plantilla por defecto y su link de login),
// que llegaría ADEMÁS del nuestro. En su lugar usamos el cliente Admin con
// `generateLink`: genera el token/OTP en la base de datos (verificable después
// con `verifyOtp`, type 'recovery') pero NO envía ningún correo. Así solo llega
// la plantilla de FacturON con el código.
export async function resetPasswordAction(email: string) {
  const admin = createAdminClient();

  // Anti email-bombing: máx. 3 envíos de OTP por email en 30 min.
  const rl = await checkRateLimit({
    key: `otp:${email.toLowerCase()}`,
    action: 'PASSWORD_RESET_OTP',
    max: 3,
    windowSeconds: 30 * 60,
  });

  if (!rl.allowed) {
    await logAuditEvent({
      eventCode: 'RATE_LIMIT_TRIGGERED',
      description: `Envío de OTP bloqueado para ${email} por exceso de solicitudes`,
      metadata: { email },
    });
    return {
      success: false,
      error: 'Has realizado demasiadas solicitudes. Inténtalo de nuevo en unos minutos.',
    };
  }

  // Generamos el link de recuperación con el admin para obtener el OTP.
  const { data, error } = await admin.auth.admin.generateLink({
    email,
    type: 'recovery',
  });

  if (error) {
    console.error('Error generando link con Admin:', error.message);
    return { success: false, error: 'No se pudo iniciar la recuperación. Asegúrate de que el correo está registrado.' };
  }

  const code = data.properties.email_otp;

  if (!code) {
    return { success: false, error: 'No se pudo generar el código de verificación.' };
  }

  // Enviamos el correo con la plantilla de FacturON
  const mail = await sendResetPasswordEmail({
    to: email,
    code,
  });

  if (!mail.success) {
    console.error('Error enviando email con Nodemailer:', mail.error);
    return { success: false, error: 'No se pudo enviar el correo de recuperación.' };
  }

  // Auditoría: se pidió un código de recuperación (sin sesión todavía).
  await logAuditEvent({
    eventCode: 'PASSWORD_RESET_REQUESTED',
    description: `Se solicitó un código de recuperación para ${email}`,
    metadata: { email },
  });

  return { success: true };
}

// Verificar código OTP de recuperación y actualizar la contraseña.
// verifyOtp crea una sesión; luego updateUser cambia la clave.
export async function verifyResetCodeAction(email: string, code: string, newPassword: string) {
  const validationError = validatePassword(newPassword);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Anti fuerza bruta del OTP: máx. 5 intentos de código por email en 15 min.
  const rl = await checkRateLimit({
    key: `verify:${email.toLowerCase()}`,
    action: 'PASSWORD_RESET_VERIFY',
    max: 5,
    windowSeconds: 15 * 60,
  });

  if (!rl.allowed) {
    await logAuditEvent({
      eventCode: 'RATE_LIMIT_TRIGGERED',
      description: `Verificación de OTP bloqueada para ${email} por exceso de intentos`,
      metadata: { email },
    });
    return {
      success: false,
      error: 'Demasiados intentos. Espera unos minutos o solicita un código nuevo.',
    };
  }

  const supabase = await createClient();

  // 1) Verificar OTP → crea sesión
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'recovery',
  });

  if (verifyError) {
    await logAuditEvent({
      eventCode: 'PASSWORD_RESET_CODE_FAILED',
      description: `Código de recuperación inválido o caducado para ${email}`,
      metadata: { email, reason: verifyError.message },
    });
    return {
      success: false,
      error: verifyError.message.includes('Invalid')
        ? 'El código es inválido o ha caducado. Solicita uno nuevo.'
        : verifyError.message,
    };
  }

  // 2) Actualizar contraseña
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Auditoría: cambio de clave completado (la sesión ya existe aquí).
  await logAuditEvent({
    eventCode: 'PASSWORD_RESET_COMPLETED',
    description: `Contraseña actualizada vía código de recuperación para ${email}`,
  });

  return { success: true };
}

// Validación de contraseña compartida (cliente y servidor).
// No se exporta: en un archivo 'use server' todo lo exportado debe ser async.
function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (password.length > 128) {
    return 'La contraseña es demasiado larga.';
  }
  return null;
}

// Guardar la nueva contraseña (flujo de recuperación por email).
// Solo es válido si existe una sesión activa: si el enlace caducó o ya se usó,
// el callback de Supabase no creó sesión y aquí se rechaza.
export async function updatePasswordAction(password: string) {
  const validationError = validatePassword(password);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'El enlace ha caducado o ya no es válido. Vuelve a solicitar la recuperación.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    eventCode: 'PASSWORD_RESET_COMPLETED',
    description: 'Contraseña actualizada desde el flujo de recuperación',
    userId: user.id,
  });

  return { success: true };
}

// Cambiar la contraseña desde dentro del panel (Configuración).
// Exige la contraseña ACTUAL para evitar que un atacante con una sesión abierta
// cambie la clave sin conocerla (defensa ante robo/hijack de sesión).
export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const validationError = validatePassword(newPassword);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: 'No hay sesión activa.' };
  }

  // 1) Verificamos que la contraseña actual es correcta.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: 'La contraseña actual no es correcta.' };
  }

  // 2) Guardamos la nueva. Se detecta cuando es idéntica a la actual.
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logAuditEvent({
    eventCode: 'PASSWORD_CHANGED',
    description: 'Contraseña cambiada desde la configuración del panel',
    userId: user.id,
  });

  return { success: true };
}

export async function getAuthStatusAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { authenticated: !!user };
}