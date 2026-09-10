-- ============================================================
-- FACTURIFY — SCHEMA COMPLETO DE BASE DE DATOS
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Última actualización: 2026-09-10
-- ============================================================

-- ==========================================
-- 1. EMPRESAS (COMPANIES)
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  postal_code VARCHAR(16),
  city TEXT,
  verifactu_enabled BOOLEAN DEFAULT true NOT NULL,
  fiscal_config JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 2. MIEMBROS DE EMPRESA (COMPANY_MEMBERS)
-- ==========================================
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS company_user_idx
  ON company_members (company_id, user_id);

-- ==========================================
-- 3. CLIENTES (CUSTOMERS)
-- ==========================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_id VARCHAR(64) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  postal_code VARCHAR(16),
  city TEXT,
  telephone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 4. SERIES DE FACTURACIÓN (INVOICE_SERIES)
-- ==========================================
CREATE TABLE IF NOT EXISTS invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  series_code VARCHAR(32) NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0 NOT NULL,
  last_hash TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS series_company_code_year_idx
  ON invoice_series (company_id, series_code, year);

-- ==========================================
-- 5. FACTURAS (INVOICES)
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  series_code VARCHAR(32) NOT NULL,
  year INTEGER NOT NULL,
  number INTEGER NOT NULL,
  formatted_number VARCHAR(64) NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP,
  status VARCHAR(32) DEFAULT 'Pendiente' NOT NULL,

  -- Rectificación (FK se añade después de CREATE TABLE por autoreferencia)
  rectifies_invoice_id UUID,
  rectification_type VARCHAR(32),
  rectification_reason TEXT,

  -- Veri*factu encadenamiento
  prev_hash TEXT,
  current_hash TEXT,
  canonical_string TEXT,
  qr_code_url TEXT,

  -- Importes en céntimos
  subtotal_cents INTEGER DEFAULT 0 NOT NULL,
  vat_total_cents INTEGER DEFAULT 0 NOT NULL,
  total_cents INTEGER DEFAULT 0 NOT NULL,
  currency VARCHAR(8) DEFAULT 'EUR' NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_locked BOOLEAN DEFAULT true NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_company_series_number_idx
  ON invoices (company_id, series_code, number, year);

-- FK de autoreferencia (rectifica a otra factura de la misma empresa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_rectifies_fkey'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_rectifies_fkey
      FOREIGN KEY (rectifies_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================================
-- 6. LÍNEAS DE FACTURA (INVOICE_LINES)
-- ==========================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_index INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  quantity NUMERIC(20, 6) DEFAULT '1' NOT NULL,
  unit_price_cents INTEGER DEFAULT 0 NOT NULL,
  vat_percent NUMERIC(5, 2) NOT NULL,
  vat_amount_cents INTEGER DEFAULT 0 NOT NULL,
  total_amount_cents INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 7. GASTOS Y COMPRAS (EXPENSES)
-- ==========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_tax_id VARCHAR(64),
  invoice_reference VARCHAR(64),
  expense_date TIMESTAMP DEFAULT NOW() NOT NULL,
  category VARCHAR(64) DEFAULT 'General' NOT NULL,
  description TEXT,
  subtotal_cents INTEGER DEFAULT 0 NOT NULL,
  vat_percent NUMERIC(5, 2) DEFAULT '21' NOT NULL,
  vat_amount_cents INTEGER DEFAULT 0 NOT NULL,
  irpf_percent NUMERIC(5, 2) DEFAULT '0' NOT NULL,
  irpf_amount_cents INTEGER DEFAULT 0 NOT NULL,
  total_cents INTEGER DEFAULT 0 NOT NULL,
  payment_method VARCHAR(32) DEFAULT 'TRANSFERENCIA',
  status VARCHAR(32) DEFAULT 'Pagado' NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 8. PRESUPUESTOS (ESTIMATES)
-- ==========================================
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

CREATE TABLE IF NOT EXISTS estimate_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(20, 6) DEFAULT '1' NOT NULL,
  unit_price_cents INTEGER DEFAULT 0 NOT NULL,
  vat_percent NUMERIC(5, 2) NOT NULL,
  total_amount_cents INTEGER DEFAULT 0 NOT NULL
);

-- ==========================================
-- 9. REGISTRO DE AUDITORÍA (AUDIT_LOGS)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID,
  event_code VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(64),
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 10. CATÁLOGO DE PRODUCTOS / SERVICIOS
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER DEFAULT 0 NOT NULL,
  default_vat INTEGER DEFAULT 21 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 11. CONFIGURACIÓN VISUAL EMPRESA
-- ==========================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  theme_color VARCHAR(7) DEFAULT '#4f46e5',
  template_id VARCHAR(64) DEFAULT 'clasico-tradicional',
  font_family VARCHAR(50) DEFAULT 'Roboto',
  logo_url TEXT,

  -- Certificado digital Veri*factu (cifrado AES-256-GCM)
  aeat_pfx_data TEXT,
  aeat_pfx_password TEXT,
  aeat_environment VARCHAR(16) DEFAULT 'sandbox',
  aeat_cert_subject TEXT,
  aeat_cert_valid_from TIMESTAMP,
  aeat_cert_valid_to TIMESTAMP,

  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 12. INVITACIONES DE REGISTRO
-- ==========================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ENVIADA',
  expires_at TIMESTAMP NOT NULL,
  created_by UUID,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_idx
  ON invitations (token_hash);

CREATE INDEX IF NOT EXISTS invitations_email_status_idx
  ON invitations (email, status);

-- ==========================================
-- 13. ENVÍOS VERI*FACTU A LA AEAT (COLA)
-- ==========================================
CREATE TABLE IF NOT EXISTS verifactu_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  operation_type VARCHAR(16) NOT NULL,
  xml_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  csv VARCHAR(64),
  aeat_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verifactu_queue_ready_idx
  ON verifactu_submissions (status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS verifactu_submission_invoice_idx
  ON verifactu_submissions (invoice_id, operation_type);
