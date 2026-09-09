-- ============================================================
-- 0001_audit_immutable.sql — Integridad del registro de auditoría
-- ============================================================
-- Aplicar en el SQL Editor de Supabase (proyecto FacturON).
-- Idempotente: se puede ejecutar más de una vez sin error.
--
-- La tabla `audit_logs` ya existe (creada a mano) y YA tiene un
-- trigger de inmutabilidad para UPDATE/DELETE:
--   trg_prevent_audit_logs_mutation → prevent_audit_log_mutation()
-- Por eso aquí NO se crea otro trigger de UPDATE/DELETE ni la tabla.
--
-- Esta migración SOLO añade:
--   1) Índices para las consultas de la pantalla /auditoria.
--   2) Una guarda de TRUNCATE (el trigger existente no la cubre),
--      con función propia para no chocar con la suya.
-- ============================================================

-- 1. Índices de consulta (no rompen nada si ya existen)
create index if not exists audit_company_ts_idx on audit_logs(company_id, timestamp);
create index if not exists audit_event_ts_idx  on audit_logs(event_code, timestamp);
create index if not exists audit_user_idx       on audit_logs(user_id);

-- 2. La auditoría es de SOLO INSERCIÓN: prohibimos también TRUNCATE.
create or replace function prevent_audit_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs es de solo inserción: no se permite truncar el registro de auditoría';
end;
$$;

drop trigger if exists trg_audit_no_truncate on audit_logs;
create trigger trg_audit_no_truncate
  before truncate on audit_logs
  for each statement
  execute function prevent_audit_truncate();