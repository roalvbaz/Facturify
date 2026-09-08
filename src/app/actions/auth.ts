'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// NUEVO: Enviar email de recuperación
export async function resetPasswordAction(email: string) {
  const supabase = await createClient();

  // Detecta si estás en local o en Render
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Al hacer clic, van a esta ruta que validará el enlace y los llevará a cambiar la clave
    redirectTo: `${siteUrl}/api/auth/callback?next=/actualizar-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// NUEVO: Guardar la nueva contraseña
export async function updatePasswordAction(password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}