-- ============================================================
-- PRESUPUESTOS: migración que completa las tablas estimates y
-- estimate_lines definidas en MASTER_SCHEMA.sql.
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- para funcionar independientemente de si MASTER_SCHEMA se aplicó.
-- ============================================================

-- 1. Tabla estimates — recreate if not exists (same as MASTER_SCHEMA + new columns)
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  formatted_number VARCHAR(64) NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expiry_date TIMESTAMP,
  status VARCHAR(32) DEFAULT 'Borrador' NOT NULL,
  converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subtotal_cents INTEGER DEFAULT 0 NOT NULL,
  vat_total_cents INTEGER DEFAULT 0 NOT NULL,
  total_cents INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Columnas nuevas (aceptación pública)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS accept_token TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS accept_token_hash VARCHAR(64);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_note TEXT;

-- 2. Tabla estimate_lines — recreate if not exists + new columns
CREATE TABLE IF NOT EXISTS estimate_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(20, 6) DEFAULT '1' NOT NULL,
  unit_price_cents INTEGER DEFAULT 0 NOT NULL,
  vat_percent NUMERIC(5, 2) NOT NULL,
  total_amount_cents INTEGER DEFAULT 0 NOT NULL
);

-- Columnas nuevas (alineación con invoice_lines)
ALTER TABLE estimate_lines ADD COLUMN IF NOT EXISTS line_index INTEGER DEFAULT 0;
ALTER TABLE estimate_lines ADD COLUMN IF NOT EXISTS vat_amount_cents INTEGER DEFAULT 0;

-- 3. Índices
CREATE INDEX IF NOT EXISTS estimates_company_idx ON estimates(company_id);
CREATE INDEX IF NOT EXISTS estimates_token_hash_idx ON estimates(accept_token_hash);

-- 4. Trazabilidad: source_estimate_id en invoices (opcional)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL;
