-- ============================================================
-- enable-rls.sql — Cerrar el acceso a datos por la API REST
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase (proyecto FacturON).
-- Idempotente: se puede ejecutar más de una vez sin error.
--
-- ⚠️ IMPORTANTE: ANTES de activar, asegúrate de que TODA lectura/
--    escritura de tablas la hace el servidor vía Drizzle (rol
--    `postgres` con DATABASE_URL). El rol `postgres` BYPASEA RLS
--    por defecto, así que la app sigue funcionando. El cliente
--    (rol anónimo con la anon_key) queda BLOQUEADO para tablas.
--
-- Riesgo que esto resuelve:
--   Con RLS desactivado, cualquier persona con la anon_key pública
--   (que viaja en el frontend) puede hacer:
--     GET https://<ref>.supabase.co/rest/v1/audit_logs?select=*
--   y leer TODAS las tablas (empresas, facturas, audit_logs con IPs).
-- ============================================================

-- 1. Verificación previa (debe decir true en forzado para el rol postgres)
--    El rol postgres ignora RLS a menos que uses FORCE.

-- 2. Activar RLS en TODAS las tablas públicas.
alter table public.audit_logs        enable row level security;
alter table public.companies         enable row level security;
alter table public.company_members   enable row level security;
alter table public.customers         enable row level security;
alter table public.invoices          enable row level security;
alter table public.invoice_lines     enable row level security;
alter table public.invoice_series    enable row level security;
alter table public.expenses          enable row level security;
alter table public.products          enable row level security;
alter table public.estimates         enable row level security;
alter table public.estimate_lines    enable row level security;
alter table public.company_settings  enable row level security;
alter table public.invitations       enable row level security;
alter table public.security_counters enable row level security;

-- 3. FORCE para que el rol postgres (Drizzle) SÍ pase por RLS.
--    Esto es el "aislamiento absoluto" que exige el planteamiento
--    Veri*factu: ni el propio backend toca datos sin pasar por
--    políticas. Si tu backend necesita crear datos en el registro y
--    aún no tienes políticas de INSERT para el rol postgres, NO
--    actives el FORCE todavía: primero añade las políticas de abajo.
-- alter table public.audit_logs force row level security;

-- 4. POLÍTICAS (opcional por ahora).
--    Con RLS activado y SIN políticas, los roles anon/authenticated
--    quedan bloqueados (que es lo que queremos: solo el servidor
--    toca datos). No hace falta crear ninguna política para eso.

--    Si más adelante necesitas que la API REST sirva datos a roles
--    autenticados, aquí se añadirían politicas `using`/`with check`.

-- 5. Verificación post-cambio.
--    select relname, relrowsecurity
--    from pg_class
--    where relname in ('audit_logs','companies','invoices','customers')
--      and relnamespace = 'public'::regnamespace;