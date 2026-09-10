/**
 * Aplica las migraciones faltantes a la base de datos.
 * Ejecutar con: node scripts/apply-migrations.js
 */
require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function run() {
  console.log('🔌 Conectando a la base de datos...');

  // 1. Columnas AEAT en company_settings
  await sql.unsafe`ALTER TABLE company_settings
    ADD COLUMN IF NOT EXISTS aeat_pfx_data text,
    ADD COLUMN IF NOT EXISTS aeat_pfx_password text,
    ADD COLUMN IF NOT EXISTS aeat_environment varchar(16) DEFAULT 'sandbox',
    ADD COLUMN IF NOT EXISTS aeat_cert_subject text,
    ADD COLUMN IF NOT EXISTS aeat_cert_valid_from timestamp,
    ADD COLUMN IF NOT EXISTS aeat_cert_valid_to timestamp`;
  console.log('✅ Columnas AEAT añadidas a company_settings');

  // 2. Tabla verifactu_submissions
  await sql.unsafe`CREATE TABLE IF NOT EXISTS verifactu_submissions (
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
  )`;
  console.log('✅ Tabla verifactu_submissions creada');

  // 3. Índices
  await sql.unsafe`CREATE INDEX IF NOT EXISTS verifactu_queue_ready_idx ON verifactu_submissions (status, next_retry_at, created_at)`;
  await sql.unsafe`CREATE INDEX IF NOT EXISTS verifactu_submission_invoice_idx ON verifactu_submissions (invoice_id, operation_type)`;
  console.log('✅ Índices creados');

  // 4. Verificar
  const cols = await sql.unsafe`SELECT column_name FROM information_schema.columns WHERE table_name = 'company_settings' ORDER BY ordinal_position`;
  console.log('\n📋 Columnas de company_settings:', cols.map(c => c.column_name).join(', '));

  const subs = await sql.unsafe`SELECT column_name FROM information_schema.columns WHERE table_name = 'verifactu_submissions' ORDER BY ordinal_position`;
  console.log('📋 Columnas de verifactu_submissions:', subs.map(c => c.column_name).join(', '));

  await sql.end();
  console.log('\n🎉 ¡Migraciones aplicadas correctamente!');
}

run().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
