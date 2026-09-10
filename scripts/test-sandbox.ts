/**
 * Script de integración con el SANDBOX de la AEAT (preproducción Veri*factu).
 *
 * Construye una factura de prueba con buildAltaXML y la envía al endpoint de
 * preproducción usando el certificado digital indicado en .env.
 *
 * ⚠️ Requiere el certificado de PRUEBAS de la AEAT (no sirve el self-signed).
 * Se obtiene desde la sede electrónica de la Agencia Tributaria (apartado de
 * pruebas / ensayo de Veri*factu). Debe ser un PFX/PKCS12.
 *
 * Configuración en .env:
 *   SANDBOX_PFX_BASE64=...        (base64 del PFX, alternativa a SANDBOX_PFX_PATH)
 *   SANDBOX_PFX_PATH=C:/ruta/cert.pfx
 *   SANDBOX_PFX_PASSWORD=contraseña
 *   SANDBOX_NIF_EMISOR=B12345678  (NIF que consta en el certificado)
 *
 * Uso:
 *   npx tsx scripts/test-sandbox.ts [--nif=X] [--importe=121.00] [--desc="..."]
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { buildAltaXML } from '../src/lib/verifactu/xml/builder';
import { submitToVerifactu } from '../src/lib/verifactu/soap/client';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function getPfx(): { pfxBase64: string; password: string } {
  const password = process.env.SANDBOX_PFX_PASSWORD;
  if (!password) {
    throw new Error('Falta SANDBOX_PFX_PASSWORD en .env');
  }
  const b64 = process.env.SANDBOX_PFX_BASE64;
  if (b64 && b64.trim()) return { pfxBase64: b64.trim(), password };

  const pfxPath = process.env.SANDBOX_PFX_PATH;
  if (!pfxPath) {
    throw new Error('Falta SANDBOX_PFX_BASE64 o SANDBOX_PFX_PATH en .env');
  }
  return {
    pfxBase64: fs.readFileSync(pfxPath.trim()).toString('base64'),
    password,
  };
}

async function main() {
  console.log('== Test Sandbox Veri*factu ==\n');

  const { pfxBase64, password } = getPfx();
  console.log('✓ Certificado PFX cargado');

  const nifEmisor = arg('nif') || process.env.SANDBOX_NIF_EMISOR || 'B12345678';
  const importeTotal = Number(arg('importe') || '121.00');
  const baseImponible = Number((importeTotal / 1.21).toFixed(2));
  const cuotaRepercutida = Number((importeTotal - baseImponible).toFixed(2));
  const descripcion = arg('desc') || 'Factura de prueba sandbox Veri*factu';

  const now = new Date();
  const fechaExpedicion = now.toISOString().slice(0, 10);
  const numeroFactura = `SBX-${now.getFullYear()}P${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-5)}`;

  // La huella es el SHA-256 del historial (64 chars). Para el test usamos un
  // hash determinista del número de factura (en producción viene del encadenamiento).
  const huella = crypto.createHash('sha256').update(`facturify-test:${numeroFactura}`).digest('hex');

  const xmlBody = buildAltaXML({
    nifEmisor,
    nombreRazonSocialEmisor: 'Facturify S.L.',
    ejercicio: now.getFullYear(),
    periodo: String(now.getMonth() + 1).padStart(2, '0'),
    numeroFactura,
    fechaExpedicion,
    tipoFactura: 'F1',
    claveRegimen: '01',
    descripcionOperacion: descripcion,
    importeTotal,
    baseImponible,
    cuotaRepercutida,
    detalleIVA: [
      { tipoImpositivo: 21, baseImponible, cuotaRepercutida },
    ],
    destinatarios: [{ nif: 'B98765432', nombreRazonSocial: 'Cliente Test S.L.' }],
    huella,
  });

  console.log('📄 Factura de prueba:');
  console.log(`   NIF emisor  : ${nifEmisor}`);
  console.log(`   Nº factura  : ${numeroFactura}`);
  console.log(`   Fecha       : ${fechaExpedicion}`);
  console.log(`   Importe     : ${importeTotal.toFixed(2)} € (base ${baseImponible.toFixed(2)} + IVA ${cuotaRepercutida.toFixed(2)})`);
  console.log(`   XML         : ${xmlBody.length} bytes`);
  console.log('');
  console.log('📡 Enviando al sandbox de la AEAT...');
  console.log('');

  const respuesta = await submitToVerifactu({
    xmlBody,
    pfxBase64,
    pfxPassword: password,
    environment: 'sandbox',
  });

  console.log('== Respuesta de la AEAT ==');
  if (respuesta.success) {
    console.log('✅ ENVÍO ACEPTADO');
  } else {
    console.log('❌ ENVÍO RECHAZADO');
  }
  console.log(`   Estado      : ${respuesta.estadoEnvio || (respuesta.success ? 'Conforme' : 'No conforme')}`);
  console.log(`   CSV         : ${respuesta.csv || '(sin CSV)'}`);
  console.log(`   HTTP        : ${respuesta.httpStatus ?? '-'}`);
  console.log(`   Tiempo      : ${respuesta.elapsedMs ?? '-'} ms`);

  if (respuesta.errores && respuesta.errores.length > 0) {
    console.log('\n   Errores devueltos:');
    for (const err of respuesta.errores) {
      console.log(`     - [${err.codigo}] ${err.descripcion}`);
    }
  }

  if (!respuesta.success && respuesta.error) {
    console.log(`   Mensaje     : ${respuesta.error}`);
  }

  if (respuesta.rawResponseXml) {
    const dumpPath = 'sandbox-response.xml';
    fs.writeFileSync(dumpPath, respuesta.rawResponseXml, 'utf8');
    console.log(`\n🧾 Respuesta SOAP completa guardada en: ${dumpPath}`);
  }

  // Código de salida: 0 si la AEAT aceptó, 1 si no
  process.exit(respuesta.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fallo del script:', err?.message || err);
  process.exit(1);
});