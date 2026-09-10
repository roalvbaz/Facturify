/**
 * Tests del cifrado AES-256-GCM de certificados PFX (cipher.ts).
 *
 * Verifican:
 *  - Round-trip encrypt → decrypt
 *  - Formato "iv:authTag:ciphertext" (3 partes base64url)
 *  - Negación con clave incorrecta (fail)
 *  - Rechazo de CERT_ENCRYPTION_KEY mal formada
 *  - Comparación timing-safe
 */

import { it, expect, describe, beforeAll, afterAll } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  safeEqual,
} from '../cipher';

const VALID_KEY = 'c'.repeat(64); // hex de 64 = 32 bytes AES-256
const OTHER_KEY = 'd'.repeat(64);

describe('cipher', () => {
  const originalKey = process.env.CERT_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.CERT_ENCRYPTION_KEY = VALID_KEY;
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.CERT_ENCRYPTION_KEY;
    else process.env.CERT_ENCRYPTION_KEY = originalKey;
  });

  it('cifra y descifra un secreto round-trip', () => {
    const secret = 'contraseña-del-pfx-super-secreta';
    const enc = encryptSecret(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it('el formato de salida es "iv:authTag:ciphertext" en base64url', () => {
    const enc = encryptSecret('abc');
    const parts = enc.split(':');
    expect(parts).toHaveLength(3);
    // base64url solo usa [A-Za-z0-9_-] y no contiene ':'
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    // iv de 12 bytes → 16 chars base64url
    expect(parts[0].length).toBe(16);
  });

  it('cada cifrado produce un IV distinto (no determinista)', () => {
    const a = encryptSecret('mismo-texto');
    const b = encryptSecret('mismo-texto');
    expect(a).not.toBe(b);
  });

  it('falla al descifrar con un dato alterado (auth tag mismatch)', () => {
    const enc = encryptSecret('secreto');
    const tampered = enc.slice(0, -2) + (enc.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('lanza si el payload no tiene 3 partes', () => {
    expect(() => decryptSecret('solo-una-parte')).toThrow(/no válido/);
    expect(() => decryptSecret('a:b:c:d')).toThrow(/no válido/);
  });

  it('solo descifra con la misma clave', () => {
    const enc = encryptSecret('materia');
    process.env.CERT_ENCRYPTION_KEY = OTHER_KEY;
    try {
      expect(() => decryptSecret(enc)).toThrow();
    } finally {
      process.env.CERT_ENCRYPTION_KEY = VALID_KEY;
    }
  });

  it('rechaza CERT_ENCRYPTION_KEY mal formada', () => {
    process.env.CERT_ENCRYPTION_KEY = 'clave-demasiado-corta';
    try {
      expect(() => encryptSecret('x')).toThrow(/32 bytes|CERT_ENCRYPTION_KEY/);
    } finally {
      process.env.CERT_ENCRYPTION_KEY = VALID_KEY;
    }
  });

  it('lanza si falta CERT_ENCRYPTION_KEY', () => {
    delete process.env.CERT_ENCRYPTION_KEY;
    try {
      expect(() => encryptSecret('x')).toThrow(/Falta CERT_ENCRYPTION_KEY/);
    } finally {
      process.env.CERT_ENCRYPTION_KEY = VALID_KEY;
    }
  });

  it('safeEqual compara en tiempo constante', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false); // longitudes distintas
  });
});