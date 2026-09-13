import crypto from 'crypto';
import { sql, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendRegistrationInvitationEmail,
  sendCompanyMemberInvitationEmail,
} from '@/lib/email/email';
import { logAuditEvent } from '@/lib/audit';

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

/** Enlace de aceptación para usuarios que YA tienen cuenta en FacturON. */
export function getAcceptanceLink(token: string): string {
  return `${getSiteUrl()}/aceptar-invitacion?invite=${token}`;
}

/** Etiqueta legible para un rol de miembro (OWNER/ADMIN/MEMBER). */
export function roleLabel(role?: string | null): string | undefined {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'OWNER') return 'Propietario';
  return role ? 'Miembro' : undefined;
}

/**
 * Busca el id del usuario en Supabase Auth por email.
 * Solo lectura sobre `auth.users`, necesaria cuando el usuario ya
 * existía (p. ej. invitación anterior) y no podemos crearlo otra vez.
 */
export async function getAuthUserIdByEmail(email: string): Promise<string | null> {
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
 * Crea (o renueva) una invitación para un email y, si se pide, envía el correo.
 *
 * Dos modos según `opts.companyId`:
 *
 *  - PLATAFORMA (companyId = null): flujo clásico de /invitaciones. El
 *    invitado NO tiene cuenta aún y entra por /registro?invite=... a crear
 *    su perfil. Si el email ya se registró → error.
 *
 *  - EQUIPO (companyId presente): un OWNER/ADMIN invita a alguien a una
 *    empresa.
 *      · Si el email YA tiene cuenta en FacturON → correo de ACEPTACIÓN
 *        con enlace a /aceptar-invitacion?invite=... (solo acepta).
 *      · Si NO tiene cuenta → se le pre-crea la cuenta (solo email) y recibe
 *        el correo de REGISTRO con /registro?invite=...; al darse de alta
 *        quedará vinculado a la empresa con `invited_role`.
 *
 * Si ya hay una invitación pendiente (ENVIADA) para ese email/empresa se
 * regenera el token (el enlace anterior queda invalidado) y se reenvía.
 */
export async function createInvitation(opts: {
  email: string;
  createdBy?: string | null;
  sendEmail?: boolean;
  companyId?: string | null;
  invitedRole?: 'MEMBER' | 'ADMIN';
  companyName?: string | null;
}): Promise<CreateInvitationResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: 'El email es obligatorio' };
  }

  const isCompanyInvite = Boolean(opts.companyId);

  try {
    const role = opts.invitedRole === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    // Invitación más reciente de este email (del mismo tipo).
    const [latest] = await db
      .select()
      .from(invitations)
      .where(
        isCompanyInvite
          ? sql`lower(${invitations.email}) = ${email} and ${invitations.company_id} = ${opts.companyId}`
          : sql`lower(${invitations.email}) = ${email} and ${invitations.company_id} is null`
      )
      .orderBy(desc(invitations.created_at))
      .limit(1);

    if (!isCompanyInvite && latest?.status === 'REGISTRADA') {
      return { ok: false, error: `El email ${email} ya creó su cuenta.` };
    }
    if (latest?.status === 'REGISTRADA') {
      return { ok: false, error: `El email ${email} ya aceptó la invitación a esa empresa.` };
    }

    // En modo EQUIPO distinguimos cuentas existentes (aceptación) de nuevas (registro).
    const existingUserId = isCompanyInvite ? await getAuthUserIdByEmail(email) : null;

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
        .set({
          token,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_by: opts.createdBy ?? null,
          ...(isCompanyInvite ? { company_id: opts.companyId, invited_role: role } : {}),
        })
        .where(eq(invitations.id, latest.id));
      invitationId = latest.id;
    } else {
      // Nueva invitación: el usuario de Auth debe existir (empresa: se crea si no)…
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
          ...(isCompanyInvite ? { company_id: opts.companyId, invited_role: role } : {}),
        })
        .returning({ id: invitations.id });
      invitationId = row.id;
      created = true;
    }

    // Auditoría (con contexto de empresa cuando aplica).
    if (isCompanyInvite) {
      await logAuditEvent({
        eventCode: created ? 'COMPANY_MEMBER_INVITED' : 'INVITATION_RENEWED',
        description: created
          ? `Invitación a ${email} para unirse a la empresa como ${roleLabel(role)}`
          : `Enlace de invitación de equipo renovado para ${email}`,
        userId: opts.createdBy ?? null,
        companyId: opts.companyId,
        metadata: { email, invitationId, role },
      });
    } else {
      await logAuditEvent({
        eventCode: created ? 'INVITATION_CREATED' : 'INVITATION_RENEWED',
        description: created
          ? `Invitación de registro creada para ${email}`
          : `Enlace de invitación renovado para ${email}`,
        userId: opts.createdBy ?? null,
        metadata: { email, invitationId },
      });
    }

    // Envío opcional del correo (aceptación si tiene cuenta, registro si es nueva)
    if (opts.sendEmail) {
      let mail: { success: boolean; error?: string };
      if (isCompanyInvite && existingUserId) {
        mail = await sendCompanyMemberInvitationEmail({
          to: email,
          acceptLink: getAcceptanceLink(token),
          companyName: opts.companyName || 'tu empresa',
          roleLabel: roleLabel(role),
        });
      } else {
        mail = await sendRegistrationInvitationEmail({
          to: email,
          registerLink: getRegisterLink(token),
          ...(opts.companyName ? { companyName: opts.companyName, roleLabel: roleLabel(role) } : {}),
        });
      }
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

/** Lista SOLO las invitaciones de plataforma para /invitaciones (sin token). */
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
    .where(sql`${invitations.company_id} is null`)
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
      company_id: invitations.company_id,
      invited_role: invitations.invited_role,
    })
    .from(invitations)
    .where(eq(invitations.token_hash, hashToken(token)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}