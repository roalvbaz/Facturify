-- Tabla de envíos Veri*factu a la AEAT (cola de reintentos)
-- Cada factura emitida genera un registro aquí; el cron procesador lo envía a la AEAT.

CREATE TABLE IF NOT EXISTS verifactu_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  operation_type VARCHAR(16) NOT NULL, -- 'ALTA' | 'ANULACION'
  xml_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE | ENVIADO | CONFORME | NO_CONFORME | ERROR
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  csv VARCHAR(64), -- Código Seguro de Verificación
  aeat_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para el procesador de cola: busca items listos para enviar
CREATE INDEX IF NOT EXISTS verifactu_queue_ready_idx
  ON verifactu_submissions (status, next_retry_at, created_at);

-- Índice para buscar el estado de un envío concreto
CREATE INDEX IF NOT EXISTS verifactu_submission_invoice_idx
  ON verifactu_submissions (invoice_id, operation_type);

COMMENT ON TABLE verifactu_submissions IS 'Cola de envíos Veri*factu a la AEAT con reintentos exponenciales';
COMMENT ON COLUMN verifactu_submissions.status IS 'PENDIENTE | ENVIADO | CONFORME | NO_CONFORME | ERROR';
COMMENT ON COLUMN verifactu_submissions.operation_type IS 'ALTA = factura emitida, ANULACION = factura anulada';
COMMENT ON COLUMN verifactu_submissions.next_retry_at IS 'Momento del próximo reintento (backoff exponencial)';
