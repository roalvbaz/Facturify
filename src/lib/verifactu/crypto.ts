/**
 * Genera el hash criptográfico SHA-256 normalizado en 64 caracteres mayúsculas
 * utilizando la Web Crypto API (compatible con Cloudflare Workers, Next.js y Edge Runtime).
 */
export async function generateInvoiceHash(canonicalString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);

  // Cómputo SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Conversión de ArrayBuffer a cadena hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  // Veri*factu exige la huella obligatoriamente en mayúsculas
  return hashHex.toUpperCase();
}