-- ============================================================
-- 0002_security_counters.sql — Rate limiting (base de datos)
-- ============================================================
-- Aplicar en el SQL Editor de Supabase (proyecto FacturON).
-- Idempotente: se puede ejecutar más de una vez sin error.
--
-- Tabla de contadores atómicos para limitar intentos (login,
-- envío de OTP, verificación de código, admin invite). Cada fila
-- es un contador por (clave, acción, ventana de tiempo).
-- ============================================================

create table if not exists security_counters (
  key          text         not null,           -- p.ej. email normalizado o IP
  action       varchar(64)  not null,           -- p.ej. 'LOGIN_FAILED', 'PASSWORD_RESET_OTP'
  window_start timestamptz  not null,           -- inicio de la ventana (bucket)
  count        integer      not null default 0,
  primary key (key, action, window_start)
);