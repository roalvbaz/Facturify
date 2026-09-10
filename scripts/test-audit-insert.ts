// Script de diagnóstico: prueba el INSERT directo en audit_logs
// Ejecutar: npx tsx scripts/test-audit-insert.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

console.log('🔌 Conectando a la BD...');
const client = postgres(url, { ssl: { rejectUnauthorized: false } });
const db = drizzle(client, { schema });

async function main() {
  console.log('🧪 Probando sentencia con dólar-parametrized (como drizzle)...');

  // 1. INSERT directo crudo — ¿funciona la conexión y la tabla?
  try {
    const res = await client`
      insert into audit_logs (company_id, user_id, event_code, description, ip_address)
      values (NULL, NULL, ${'DIAGNOSTIC_TEST'}, ${'Test de diagnóstico - insert crudo'}, ${'127.0.0.1'})
      returning id, timestamp
    `;
    console.log('✅ INSERT crudo OK:', res);
  } catch (e) {
    console.error('❌ INSERT crudo FALLO:', e);
  }

  // 2. INSERT vía Drizzle ORM
  try {
    const [row] = await db.insert(schema.audit_logs).values({
      company_id: null,
      user_id: null,
      event_code: 'DIAGNOSTIC_TEST',
      description: 'Test de diagnóstico - insert drizzle',
      metadata: { test: true },
      ip_address: '127.0.0.1',
    }).returning({ id: schema.audit_logs.id, timestamp: schema.audit_logs.timestamp });
    console.log('✅ INSERT Drizzle OK:', row);
  } catch (e) {
    console.error('❌ INSERT Drizzle FALLO:', e);
  }

  // 3. Ver permisos del rol actual
  try {
    const [role] = await client`select current_user as rol`;
    console.log('👤 Rol actual:', role);
  } catch (e) {
    console.error('❌ No se pudo consultar rol:', e);
  }

  // 4. Probar un insert con evento de producción real (corto)
  try {
    const [row] = await db.insert(schema.audit_logs).values({
      company_id: null,
      user_id: null,
      event_code: 'USER_LOGIN',
      description: 'Test diagnóstico USER_LOGIN',
      ip_address: '127.0.0.1',
    }).returning({ id: schema.audit_logs.id });
    console.log('✅ INSERT USER_LOGIN OK:', row);
  } catch (e) {
    console.error('❌ INSERT USER_LOGIN FALLO:', e);
  }

  await client.end();
  console.log('🏁 Fin del diagnóstico');
}

main().catch((e) => {
  console.error('💥 Error fatal:', e);
  process.exit(1);
});