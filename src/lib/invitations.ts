import crypto from 'crypto';
import { sql, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendRegistrationInvitationEmail } from '@/lib/email/email';

/** El enlace de registro caduca a los 7 días */
export const INVITE_LIFETIME_DAYS = 7;

// ============================================================
// HELPERS
// ============================================================

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export function getRegisterLink(token: string): string {
  return `${getSiteUrl()}/registro?invite=${token}`;
}

/**
 * Busca el id del usuario en Supabase Auth por email.
 * Solo lectura sobre `auth.users`, necesaria cuando el usuario ya
 * existía (p. ej. invitación anterior) y no podemos crearlo otra vez.
 */
async function getAuthUserIdByEmail(email: string): Promise<string | null> {
  try {
    const rows = await db.execute<{ id: string }>(
      sql`select id from auth.users where lower(email) = lower(${email}) limit 1`
    );
    const row = rows && rows[0];
    return row?.id ?? null;
  } catch (error) {
    console.error('Error consultando auth.users:', error);
    return null;
  }
}

/**
 * Garantiza que exista un usuario de Supabase Auth solo con el email
 * (sin contraseña). Si ya existe, devuelve su id.
 */
async function ensureSupabaseUser(email: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!error) {
    return data.user.id;
  }

  const msg = (error.message || '').toLowerCase();
  const already = msg.includes('already registered') || msg.includes('ya registrado');
  if (already) {
    const existing = await getAuthUserIdByEmail(email);
    if (existing) return existing;
    // La cuenta existe en Auth pero no la encontramos por SQL: no bloqueamos
    // la invitación, el registro la reutilizará si procede.
    throw new Error(`El email ${email} ya está registrado`);
  }

  throw new Error(error.message);
}

// ============================================================
// CREAR / REENVIAR INVITACIÓN
// ============================================================

export type CreateInvitationResult =
  | { ok: true; invitationId: string; token: string; created: boolean; emailSent: boolean; emailError?: string }
  | { ok: false; error: string };

/**
 * Crea (o renueva) la invitación de registro para un email y, si se pide,
 * envía el correo con el enlace a la página de registro.
 *
 * Reglas:
 *  - Si el email ya tiene cuenta registrada → error.
 *  - Si ya hay una invitación ENVIADA → se regenera el token (el enlace
 *    anterior queda invalidado) y se reenvía el correo.
 *  - Si no existe → se crea el usuario en Supabase (solo email) y el registro.
 */
export async function createInvitation(opts: {
  email: string;
  createdBy?: string | null;
  sendEmail?: boolean;
}): Promise<CreateInvitationResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: 'El email es obligatorio' };
  }

  try {
    // Invitación más reciente de este email
    const [latest] = await db
      .select()
      .from(invitations)
      .where(sql`lower(${invitations.email}) = ${email}`)
      .orderBy(desc(invitations.created_at))
      .limit(1);

    if (latest?.status === 'REGISTRADA') {
      return { ok: false, error: `El email ${email} ya creó su cuenta.` };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_LIFETIME_DAYS);

    let invitationId: string;
    let created = false;

    if (latest) {
      // Renovamos la invitación pendiente existente (se invalida el enlace previo)
      await db
        .update(invitations)
        .set({ token, token_hash: tokenHash, expires_at: expiresAt })
        .where(eq(invitations.id, latest.id));
      invitationId = latest.id;
    } else {
      // Nueva invitación: creamos el usuario en Auth (solo email, sin contraseña)
      const userId = await ensureSupabaseUser(email);
      const [row] = await db
        .insert(invitations)
        .values({
          email,
          token,
          token_hash: tokenHash,
          user_id: userId,
          status: 'ENVIADA',
          expires_at: expiresAt,
          created_by: opts.createdBy ?? null,
        })
        .returning({ id: invitations.id });
      invitationId = row.id;
      created = true;
    }

    // Envío opcional del correo con el enlace de registro
    if (opts.sendEmail) {
      const mail = await sendRegistrationInvitationEmail({
        to: email,
        registerLink: getRegisterLink(token),
      });
      return {
        ok: true,
        invitationId,
        token,
        created,
        emailSent: mail.success,
        ...(mail.success ? {} : { emailError: mail.error }),
      };
    }

    return { ok: true, invitationId, token, created, emailSent: false };
  } catch (error: any) {
    console.error('❌ Error creando invitación:', error);
    return { ok: false, error: error?.message || 'Error al crear la invitación' };
  }
}

/** ¿Es el usuario uno de los administradores de la plataforma? (env ADMIN_EMAILS). */
export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}

/** Lo usan los admin para "Copiar enlace". El enlace no se rota al copiarlo. */
export async function getRegisterLinkForInvitation(
  invitationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ token: invitations.token })
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);
  if (!row?.token) return null;
  return getRegisterLink(row.token);
}

/** Lista las invitaciones para la pantalla de administración (sin token). */
export async function listInvitations(): Promise<
  Array<{
    id: string;
    email: string;
    status: string;
    created_at: Date;
    expires_at: Date | null;
    responded_at: Date | null;
    created_by: string | null;
  }>
> {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      status: invitations.status,
      created_at: invitations.created_at,
      expires_at: invitations.expires_at,
      responded_at: invitations.responded_at,
      created_by: invitations.created_by,
    })
    .from(invitations)
    .orderBy(desc(invitations.created_at))
    .limit(500);
}

/** Carga una invitación por su token (hash). Solo uso en servidor. */
export async function getInvitationByToken(token: string) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      user_id: invitations.user_id,
      status: invitations.status,
      expires_at: invitations.expires_at,
      responded_at: invitations.responded_at,
    })
    .from(invitations)
    .where(eq(invitations.token_hash, hashToken(token)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}