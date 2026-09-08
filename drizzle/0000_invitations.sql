-- ============================================================
-- 0000_invitations.sql — Tabla de invitaciones de registro
-- ============================================================
-- Aplicar en el SQL Editor de Supabase (proyecto FacturON).
-- Idempotente: se puede ejecutar más de una vez sin error.
-- ============================================================

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null,                      -- token en claro del enlace (uso interno del admin para copiar el enlace)
  token_hash varchar(64) not null,          -- SHA-256 del token del enlace de registro
  user_id uuid not null,                    -- usuario de Supabase Auth creado para este email
  status varchar(32) not null default 'ENVIADA', -- 'ENVIADA' | 'REGISTRADA' | 'CANCELADA'
  expires_at timestamp not null,            -- caducidad del enlace (7 días)
  created_by uuid,                          -- quién creó la invitación (admin), null si vino del API de marketing
  responded_at timestamp,                   -- cuándo el invitado completó su registro
  created_at timestamp not null default now()
);

create unique index if not exists invitations_token_hash_idx on invitations(token_hash);
create index if not exists invitations_email_status_idx on invitations(email, status);