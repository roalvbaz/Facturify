-- ============================================================
-- audit-diagnostic.sql — Diagnóstico de la tabla audit_logs
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase (proyecto FacturON).
-- Copiar los resultados y pegarlos en el chat de Claude para
-- que pueda identificar por qué no se guardan los logs.
-- ============================================================

-- 1. ¿Existe la tabla?
SELECT EXISTS (
  SELECT FROM pg_tables WHERE tablename = 'audit_logs'
) AS table_exists;

-- 2. ¿Tiene RLS habilitado?
SELECT relname, relrowsecurity
FROM pg_class WHERE relname = 'audit_logs';

-- 3. ¿Qué políticas RLS hay?
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'audit_logs';

-- 4. ¿Existe la función prevent_audit_log_mutation?
SELECT EXISTS (
  SELECT FROM pg_proc WHERE proname = 'prevent_audit_log_mutation'
) AS fn_exists;

-- 5. ¿Qué triggers tiene la tabla?
SELECT tgname, tgtype, tgenabled
FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass;

-- 6. Conteo actual de logs
SELECT count(*) AS total_logs FROM audit_logs;

-- 7. Últimos 5 logs (si existen)
SELECT id, company_id, user_id, event_code, description, ip_address, timestamp
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 5;
