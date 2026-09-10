-- ============================================================
-- security-fixes.sql — Cierra los avisos del Security Advisor
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase (proyecto FacturON).
-- Idempotente: se puede ejecutar más de una vez sin error.
--
-- Resuelve:
--   0011 function_search_path_mutable   → SET search_path fijo en 3 funciones
--   0025 public_bucket_allows_listing  → quitar SELECT amplio en company-assets
--   auth_leaked_password_protection    → se activa desde el dashboard (paso extra)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix 0011: SEARCH_PATH INMUTABLE EN LAS FUNCIONES
-- ------------------------------------------------------------
-- Sin search_path fijo, un atacante que controle un esquema anterior
-- del search_path puede secuestrar funciones. Se fija a
-- pg_catalog,public (solo los objetos de confianza).
--
-- La query es genérica: localiza las 3 funciones por nombre y les
-- aplica SET search_path, sea cual sea su firma.
do $$
declare
  fn record;
begin
  for fn in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'check_invoice_immutability',
        'prevent_audit_log_mutation',
        'prevent_audit_truncate'
      )
  loop
    execute format(
      'alter function public.%I(%s) set search_path = pg_catalog, public',
      fn.proname,
      fn.args
    );
    raise notice 'Fijado search_path en %', fn.proname;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Fix 0025: EL BUCKET company-assets NO DEBE PERMITIR LISTAR
-- ------------------------------------------------------------
-- La política "Permitir lectura pública de company-assets" permite a
-- cualquier anónimo LISTAR todos los archivos del bucket. Para
-- descargar por URL pública el bucket NO necesita esa política
-- (el acceso se sirve directamente). La quitamos.
--
-- La app solo hace upload + getPublicUrl (no list), así que nada se
-- rompe al eliminar la política de SELECT.
drop policy if exists "Permitir lectura pública de company-assets"
  on storage.objects;

-- Si el nombre de la política fuera distinto, esto te la localiza:
-- select policyname from pg_policies
-- where schemaname = 'storage' and tablename = 'objects';

-- ------------------------------------------------------------
-- 3. Fix auth_leaked_password_protection (dashboard)
-- ------------------------------------------------------------
-- Este aviso NO se cierra por SQL: es un ajuste del panel.
-- Dashboard de Supabase:
--   Authentication → Settings → Security → Leaked Password Protection
--   → Enable (comprueba contraseñas contra HaveIBeenPwned).
--
-- (Equivalente por CLI si prefieres:
--   supabase config set auth.leak_protection_enabled true)
--
-- ------------------------------------------------------------
-- Verificación final:
   select p.proname, p.proconfig
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('check_invoice_immutability','prevent_audit_log_mutation','prevent_audit_truncate');
-- Debe mostrar {search_path=pg_catalog, public} en proconfig.