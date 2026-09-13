// ============================================================
// Auditoría central — src/lib/audit.ts
// ============================================================
// Único punto de escritura en `audit_logs`. El GUARDADO NUNCA debe
// romper la operación principal: todo va envuelto en try/catch y si
// falla solo se devuelve false (se loguea el error en consola).
//
// Se usa tanto desde server actions ('use server') como desde API
// routes. Si el llamador ya conoce userId / companyId / ipAddress,
// los pasa explícitamente; si no, el helper intenta resolverlos:
//   - IP        → cabeceras x-forwarded-for / x-real-ip
//   - empresa   → cookie `active_company_id`
//   - usuario   → sesión Supabase (createClient)
//
// Tabla de solo inserción: la inmutabilidad la garantizan los
// triggers de la BD (ver drizzle/0001_audit_immutable.sql).
// ============================================================

import { headers, cookies } from 'next/headers';
import { db } from '@/db';
import { audit_logs } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

/** Catálogo cerrado de códigos de eventos (verificado por tipos). */
export const EVENT_CODES = {
  // Autenticación
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_SIGNOUT: 'USER_SIGNOUT',
  // Contraseñas / recuperación
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_CODE_FAILED: 'PASSWORD_RESET_CODE_FAILED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  // Empresa
  COMPANY_CREATED: 'COMPANY_CREATED',
  COMPANY_ACTIVE_CHANGED: 'COMPANY_ACTIVE_CHANGED',
  COMPANY_SETTINGS_UPDATED: 'COMPANY_SETTINGS_UPDATED',
  // Clientes
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_DEACTIVATED: 'CUSTOMER_DEACTIVATED',
  // Productos
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  // Gastos
  EXPENSE_CREATED: 'EXPENSE_CREATED',
  EXPENSE_DELETED: 'EXPENSE_DELETED',
  // Facturas
  INVOICE_ISSUED: 'INVOICE_ISSUED',
  INVOICE_STATUS_CHANGED: 'INVOICE_STATUS_CHANGED',
  INVOICE_EMAIL_SENT: 'INVOICE_EMAIL_SENT',
  INVOICE_REMINDER_SENT: 'INVOICE_REMINDER_SENT',
  INVOICE_EXPORTED: 'INVOICE_EXPORTED',
  // Presupuestos
  ESTIMATE_CREATED: 'ESTIMATE_CREATED',
  ESTIMATE_UPDATED: 'ESTIMATE_UPDATED',
  ESTIMATE_SENT: 'ESTIMATE_SENT',
  ESTIMATE_ACCEPTED: 'ESTIMATE_ACCEPTED',
  ESTIMATE_REJECTED: 'ESTIMATE_REJECTED',
  ESTIMATE_MODIFICATION_REQUESTED: 'ESTIMATE_MODIFICATION_REQUESTED',
  ESTIMATE_CONVERTED: 'ESTIMATE_CONVERTED',
  ESTIMATE_PDF_DOWNLOADED: 'ESTIMATE_PDF_DOWNLOADED',
  // Invitaciones
  INVITATION_CREATED: 'INVITATION_CREATED',
  INVITATION_RENEWED: 'INVITATION_RENEWED',
  // Equipo (miembros de empresa)
  COMPANY_MEMBER_INVITED: 'COMPANY_MEMBER_INVITED',
  COMPANY_MEMBER_ADDED: 'COMPANY_MEMBER_ADDED',
  COMPANY_MEMBER_ACCEPTED: 'COMPANY_MEMBER_ACCEPTED',
  COMPANY_MEMBER_REMOVED: 'COMPANY_MEMBER_REMOVED',
  // Cron / sistema
  CRON_PAYMENT_REMINDERS_RUN: 'CRON_PAYMENT_REMINDERS_RUN',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
} as const;

export type AuditEventCode =
  (typeof EVENT_CODES)[keyof typeof EVENT_CODES];

interface LogAuditEventParams {
  eventCode: AuditEventCode;
  description: string;
  /** Empresa activa (se resuelve de la cookie si no se pasa). */
  companyId?: string | null;
  /** Usuario de la acción (se resuelve de la sesión si no se pasa). */
  userId?: string | null;
  /** Datos auxiliares (jsonb). */
  metadata?: Record<string, unknown> | null;
  /** IP del cliente (se resuelve de las cabeceras si no se pasa). */
  ipAddress?: string | null;
}

export async function logAuditEvent({
  eventCode,
  description,
  companyId = null,
  userId = null,
  metadata = null,
  ipAddress = null,
}: LogAuditEventParams): Promise<boolean> {
  try {
    let ip = ipAddress;
    let company = companyId;
    let usr = userId;

    // 1. IP desde las cabeceras de la petición (server actions / RSC).
    if (!ip) {
      try {
        const h = await headers();
        ip =
          h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          h.get('x-real-ip') ||
          null;
      } catch {
        ip = null;
      }
    }

    // 2. Empresa activa desde la cookie.
    if (!company) {
      try {
        const c = await cookies();
        company = c.get('active_company_id')?.value ?? null;
      } catch {
        company = null;
      }
    }

    // 3. Usuario desde la sesión.
    if (!usr) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        usr = user?.id ?? null;
      } catch {
        usr = null;
      }
    }

    await db.insert(audit_logs).values({
      company_id: company,
      user_id: usr,
      event_code: eventCode,
      description,
      metadata: metadata ?? null,
      ip_address: ip,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Audit OK: ${eventCode}`, { company, usr, ip });
    }
    return true;
  } catch (error) {
    console.error(`💥 Audit FAIL [${eventCode}]:`, error);
    return false;
  }
}

/** Resuelve la IP del cliente a partir de las cabeceras (para API routes). */
export function getClientIp(request: {
  headers: {
    get(name: string): string | null;
  };
}): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}