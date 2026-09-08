'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

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

// NUEVO: Actualizar el nombre de perfil del usuario
export async function updateProfileAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const fullName = (formData.get('full_name') as string)?.trim() || '';
    if (!fullName) {
      return { success: false, error: 'El nombre es obligatorio' };
    }

    // Conservamos el resto de metadatos que ya tuviera el usuario
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: fullName },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/perfil');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al actualizar el perfil' };
  }
}