'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import {
  createInvitation,
  isAdminUser,
  getRegisterLinkForInvitation,
} from '@/lib/invitations';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteLineResult = {
  email: string;
  status: 'ok' | 'duplicate' | 'invalid' | 'error';
  message: string;
};

/** Guarda común: solo los administradores (ADMIN_EMAILS) gestionan invitaciones. */
async function requireAdminUser(): Promise<
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false, error: 'No autenticado' };
  if (!isAdminUser(user.email)) {
    return { ok: false, error: 'No tienes permisos de administración.' };
  }
  return { ok: true, user: { id: user.id, email: user.email } };
}

/**
 * Añade una lista de emails como invitaciones de registro y les envía
 * el correo con el enlace a la página de registro.
 */
export async function addInvitationsAction(
  emailsText: string
): Promise<{ success: boolean; error?: string; results?: InviteLineResult[] }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const emails = (emailsText || '')
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return { success: false, error: 'Escribe al menos un correo.' };
  }

  if (emails.length > 100) {
    return { success: false, error: 'Máximo 100 correos por envío.' };
  }

  const results: InviteLineResult[] = [];
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) {
      results.push({ email, status: 'invalid', message: 'Formato de email inválido' });
      continue;
    }

    const res = await createInvitation({
      email,
      createdBy: auth.user.id,
      sendEmail: true,
    });

    if (res.ok) {
      results.push({
        email,
        status: 'ok',
        message: res.emailSent
          ? res.created
            ? 'Invitación enviada'
            : 'Invitación reenviada'
          : `Invitación creada, pero el correo no se envió${res.emailError ? `: ${res.emailError}` : ''}`,
      });
    } else {
      results.push({ email, status: 'duplicate', message: res.error || 'No se pudo invitar' });
    }
  }

  revalidatePath('/invitaciones');
  return { success: true, results };
}

/** Reenvía el correo de registro de una invitación (regenera el enlace). */
export async function resendInvitationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string; emailSent?: boolean }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const [row] = await db
    .select({ email: invitations.email, status: invitations.status })
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!row) return { success: false, error: 'Invitación no encontrada' };
  if (row.status === 'REGISTRADA') {
    return { success: false, error: 'Este invitado ya creó su cuenta.' };
  }

  const res = await createInvitation({
    email: row.email,
    createdBy: auth.user.id,
    sendEmail: true,
  });

  if (!res.ok) return { success: false, error: res.error };

  revalidatePath('/invitaciones');
  return { success: true, emailSent: res.emailSent };
}

/** Devuelve el enlace de registro de una invitación para copiarlo manualmente. */
export async function copyInvitationLinkAction(
  invitationId: string
): Promise<{ success: boolean; error?: string; link?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const link = await getRegisterLinkForInvitation(invitationId);
  if (!link) return { success: false, error: 'No se pudo obtener el enlace.' };

  return { success: true, link };
}