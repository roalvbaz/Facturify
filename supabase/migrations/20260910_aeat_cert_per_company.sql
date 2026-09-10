-- Certificado digital Veri*factu por empresa (cifrado AES-256-GCM)
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS aeat_pfx_data text,
  ADD COLUMN IF NOT EXISTS aeat_pfx_password text,
  ADD COLUMN IF NOT EXISTS aeat_environment varchar(16) DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS aeat_cert_subject text,
  ADD COLUMN IF NOT EXISTS aeat_cert_valid_from timestamp,
  ADD COLUMN IF NOT EXISTS aeat_cert_valid_to timestamp;