/**
 * Genera un certificado PFX self-signed para PRUEBAS LOCALES del módulo
 * Veri*factu (parseo de PFX, cifrado, etc.).
 *
 * ⚠️ NO es el certificado de pruebas de la AEAT. Para el sandbox real de la
 * AEAT necesitas el certificado que emite la propia Agencia Tributaria
 * (pruebas/ensayo). Este PFX sirve para validar que `parsePfx`, el cifrado y
 * el generador XML funcionan sin salir de tu máquina.
 *
 * Método documentado en la Guía Técnica de Veri*factu:
 *   - La AEAT exige certificado digital válido para firmar el canal TLS.
 *   - El certificado de pruebas se solicita en la sede de la AEAT.
 *
 * Uso:
 *   npx tsx scripts/make-test-cert.ts [output.pfx] [password]
 *
 * Ejemplo:
 *   npx tsx scripts/make-test-cert.ts facturify-test-cert.pfx mi-contraseña
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as forge from 'node-forge';

const DEFAULT_PASSWORD = 'facturify-test-password';

function main() {
  const outputPath = process.argv[2] || 'facturify-test-cert.pfx';
  const password = process.argv[3] || DEFAULT_PASSWORD;

  console.log('• Generando par de claves RSA 2048...');
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);

  console.log('• Creando certificado self-signed...');
  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = '01';
  const nearNow = new Date(Date.now() - 60_000);
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  cert.validity.notBefore = nearNow;
  cert.validity.notAfter = farFuture;

  const attrs = [
    { name: 'commonName', value: 'Facturify Test' },
    { name: 'organizationName', value: 'Facturify S.L.' },
    { name: 'countryName', value: 'ES' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(privateKey, forge.md.sha256.create());

  console.log('• Envolviendo en PFX (PKCS#12)...');
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, cert, password, {
    algorithm: '3des',
  });
  const derBytes = forge.asn1.toDer(p12Asn1).getBytes();
  const pfxBuffer = Buffer.from(derBytes, 'binary');

  fs.writeFileSync(outputPath, pfxBuffer);
  console.log('');
  console.log(`✅ Certificado de prueba escrito en: ${outputPath}`);
  console.log(`   (${(pfxBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   CN: Facturify Test · Validez: ${nearNow.toISOString().slice(0, 10)} → ${farFuture.toISOString().slice(0, 10)}`);
  console.log('');

  const resolvedPath = path.resolve(outputPath);
  console.log('Para usarlo con el script de sandbox, copia en .env:');
  console.log(`   SANDBOX_PFX_PATH=${resolvedPath}`);
  console.log(`   SANDBOX_PFX_PASSWORD=${password}`);
}

main();