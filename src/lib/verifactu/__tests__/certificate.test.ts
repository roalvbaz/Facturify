/**
 * Tests de parseo de certificados PFX (certificate.ts).
 *
 * Genera un certificado x509 self-signed + PFX (PKCS#12) en el propio test
 * usando node-forge, y verifica que parsePfx extrae correctamente:
 *  - Cert PEM y key PEM
 *  - Subject / CN
 *  - Fechas de validez
 *  - Rechazo de contraseña incorrecta / PFX corrupto
 *  - isCertificateValid
 */

import { it, expect, describe } from 'vitest';
import * as forge from 'node-forge';
import { parsePfx, isCertificateValid } from '../certificate';

const PFX_PASSWORD = 'password-de-prueba';

/** Genera un PFX self-signed en base64 (la API PKCS#12 de node-forge) */
function generateTestPfx(): string {
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date('2026-01-01T00:00:00Z');
  cert.validity.notAfter = new Date('2029-01-01T00:00:00Z');

  const attrs = [
    { name: 'commonName', value: 'Facturify Test CN' },
    { name: 'organizationName', value: 'Facturify S.L.' },
    { name: 'countryName', value: 'ES' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, cert, PFX_PASSWORD);
  return forge.util.encode64(forge.asn1.toDer(p12Asn1).getBytes());
}

describe('parsePfx', () => {
  it('extrae el certificado PEM y la clave privada', () => {
    const pfxBase64 = generateTestPfx();
    const parsed = parsePfx({ pfxBase64, password: PFX_PASSWORD });

    expect(parsed.certPem).toContain('BEGIN CERTIFICATE');
    expect(parsed.certPem).toContain('END CERTIFICATE');
    expect(parsed.keyPem).toMatch(/BEGIN (RSA |)PRIVATE KEY/);
  });

  it('extrae el subject con el CN esperado', () => {
    const parsed = parsePfx({ pfxBase64: generateTestPfx(), password: PFX_PASSWORD });
    expect(parsed.commonName).toContain('Facturify Test CN');
    expect(parsed.subject).toContain('Facturify S.L.');
  });

  it('respeta las fechas de validez del certificado', () => {
    const parsed = parsePfx({ pfxBase64: generateTestPfx(), password: PFX_PASSWORD });
    expect(parsed.validFrom).toBeInstanceOf(Date);
    expect(parsed.validTo).toBeInstanceOf(Date);
    expect(parsed.validFrom.getUTCFullYear()).toBe(2026);
    expect(parsed.validTo.getUTCFullYear()).toBe(2029);
  });

  it('lanza si falta el contenido del PFX', () => {
    expect(() => parsePfx({ pfxBase64: '', password: PFX_PASSWORD })).toThrow(/Falta el contenido/);
  });

  it('lanza si falta la contraseña', () => {
    expect(() => parsePfx({ pfxBase64: generateTestPfx(), password: '' })).toThrow(/Falta la contraseña/);
  });

  it('lanza si la contraseña es incorrecta', () => {
    expect(() => parsePfx({ pfxBase64: generateTestPfx(), password: 'password-mala' })).toThrow(
      /No se pudo leer el PFX/
    );
  });

  it('lanza si el base64 no es un PFX válido', () => {
    expect(() => parsePfx({ pfxBase64: Buffer.from('esto-no-es-un-pfx').toString('base64'), password: PFX_PASSWORD })).toThrow();
  });
});

describe('isCertificateValid', () => {
  it('devuelve true dentro del periodo de validez', () => {
    const parsed = parsePfx({ pfxBase64: generateTestPfx(), password: PFX_PASSWORD });
    expect(isCertificateValid(parsed, new Date('2027-06-01T00:00:00Z'))).toBe(true);
  });

  it('devuelve false antes del inicio de validez', () => {
    const parsed = parsePfx({ pfxBase64: generateTestPfx(), password: PFX_PASSWORD });
    expect(isCertificateValid(parsed, new Date('2020-01-01T00:00:00Z'))).toBe(false);
  });

  it('devuelve false tras la caducidad', () => {
    const parsed = parsePfx({ pfxBase64: generateTestPfx(), password: PFX_PASSWORD });
    expect(isCertificateValid(parsed, new Date('2031-01-01T00:00:00Z'))).toBe(false);
  });
});