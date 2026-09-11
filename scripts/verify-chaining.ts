#!/usr/bin/env tsx
/**
 * Verificación del encadenamiento de hashes Veri*factu (RD 1007/2023).
 *
 * Recorre las facturas de cada empresa en el orden real de creación y comprueba
 * que cada `prev_hash` coincide con el `current_hash` de la factura anterior.
 * Esto es exactamente lo que exige la AEAT: cada registro "huella" el anterior.
 *
 * Uso:
 *   npx tsx scripts/verify-chaining.ts
 *
 * Salida: un ✓/✗ por eslabón + resumen, y exit code 1 si hay cadenas rotas
 * (útil para un CI o para revisar antes del envío a la AEAT).
 */
import 'dotenv/config';
import { asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('Falta la variable DATABASE_URL en .env');
  }
  const db = drizzle(conn);

  const rows = await db
    .select({
      company_id: schema.invoices.company_id,
      series_code: schema.invoices.series_code,
      year: schema.invoices.year,
      number: schema.invoices.number,
      formatted_number: schema.invoices.formatted_number,
      created_at: schema.invoices.created_at,
      prev_hash: schema.invoices.prev_hash,
      current_hash: schema.invoices.current_hash,
      status: schema.invoices.status,
    })
    .from(schema.invoices)
    .orderBy(asc(schema.invoices.created_at), asc(schema.invoices.number));

  if (rows.length === 0) {
    console.log('ℹ️  No hay facturas en la base de datos.');
    return;
  }

  // Agrupamos por empresa respetando el orden de creación, que es el orden
  // real del encadenado (al emitir, el hash anterior es el de la última
  // factura creada de la empresa).
  const byCompany = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byCompany.get(r.company_id) ?? [];
    arr.push(r);
    byCompany.set(r.company_id, arr);
  }

  let total = 0;
  let ok = 0;
  let broken = 0;

  console.log('═'.repeat(56));
  console.log('  VERIFICACIÓN DE ENCADENAMIENTO VERI*FACTU');
  console.log('═'.repeat(56));

  for (const [companyId, invs] of byCompany) {
    const series = [...new Set(invs.map((i) => `${i.series_code}/${i.year}`))];
    console.log(`\n📦 Empresa ${companyId.slice(0, 8)}…  (${invs.length} facturas — series: ${series.join(', ')})`);

    if (series.length > 1) {
      console.warn('  ⚠️  Hay varias series/años mezclados en la MISMA cadena de hash.');
      console.warn('     El encadenado actual es a nivel de empresa (orden de creación), no por serie.');
      console.warn('     Revisa que esto es lo que quieres antes del envío a la AEAT.');
    }

    for (let i = 0; i < invs.length; i++) {
      const inv = invs[i];
      total++;
      const expectedPrev = i === 0 ? 'PREVIOUS_HASH_GENESIS' : invs[i - 1].current_hash;
      const valid = inv.prev_hash === expectedPrev;
      if (valid) ok++;
      else broken++;

      const marker = valid ? '✓' : '✗';
      console.log(
        `  ${marker} ${inv.formatted_number}  prev=${(inv.prev_hash ?? '').slice(0, 14)}…  cur=${(inv.current_hash ?? '').slice(0, 14)}…  [${inv.status}]`
      );

      if (!valid) {
        console.warn(`     → Se esperaba prev_hash = ${(expectedPrev ?? '').slice(0, 20)}…`);
      }
    }
  }

  console.log('═'.repeat(56));
  if (broken > 0) {
    console.log(`  🚨 ${broken}/${total} eslabones ROTOS — hay facturas mal encadenadas.`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ ${ok}/${total} eslabones correctos — cadena íntegra.`);
  }
  console.log('═'.repeat(56));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});