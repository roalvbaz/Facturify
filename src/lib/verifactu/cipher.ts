/**
 * Cifrado AES-256-GCM para proteger los certificados PFX en la base de datos.
 *
 * El PFX y su contraseña se guardan cifrados en `company_settings`.
 * La clave de cifrado se mantiene en la variable de entorno CERT_ENCRYPTION_KEY
 * (64 caracteres hexadecimales = 32 bytes = AES-256).
 *
 * Formato de salida: iv:authTag:ciphertext (base64url), auto-contenido.
 */

import { randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN_BYTES = 32;

function getKey(): Buffer {
  const envKey = process.env.CERT_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error(
      'Falta CERT_ENCRYPTION_KEY. Genera una con: openssl rand -hex 32',
    );
  }
  const hex = /^[0-9a-fA-F]{64}$/.test(envKey);
  if (hex) {
    return Buffer.from(envKey, 'hex');
  }
  // Si no es hex de 64, probamos como base64 de 44 chars (32 bytes)
  const b64 = Buffer.from(envKey, 'base64');
  if (b64.length === KEY_LEN_BYTES) return b64;
  throw new Error('CERT_ENCRYPTION_KEY debe ser 32 bytes: openssl rand -hex 32');
}

/** Cifra texto plano → "iv:authTag:ciphertext" (base64url) */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12); // 96 bits recomendados para GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext]
    .map((buf) => buf.toString('base64url'))
    .join(':');
}

/** Descifra "iv:authTag:ciphertext" (base64url) → texto plano */
export function decryptSecret(payload: string): string {
  if (!payload) return '';
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Dato cifrado con formato no válido.');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const authTag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  return out.toString('utf8');
}

/** Comparación en tiempo constante para evitar timing attacks */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}