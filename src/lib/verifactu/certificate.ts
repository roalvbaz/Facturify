/**
 * Manejo del certificado digital para Veri*factu (PFX/PKCS12).
 *
 * Convierte un PFX en PEM (certificado + clave privada) para usarlo en el
 * handshake TLS con la AEAT. Usa node-forge, la librería de referencia para
 * PKCS12 en Node.js.
 */

import * as forge from 'node-forge';
import { Agent } from 'node:https';

export interface ParsedCertificate {
  /** Certificado en formato PEM (BEGIN CERTIFICATE) */
  certPem: string;
  /** Clave privada en formato PEM (BEGIN PRIVATE KEY / RSA PRIVATE KEY) */
  keyPem: string;
  /** Subject del certificado, p.ej. "/C=ES/O=Sociedad/CN=..." */
  subject: string;
  /** CN extraído del subject */
  commonName: string;
  /** Fecha de inicio de validez */
  validFrom: Date;
  /** Fecha de fin de validez */
  validTo: Date;
  /** Emisor (CA) */
  issuer: string;
  /** Serial number del certificado */
  serialNumber: string;
}

/** Valida y extrae certificado + clave de un PFX en base64 */
export function parsePfx({
  pfxBase64,
  password,
}: {
  pfxBase64: string;
  password: string;
}): ParsedCertificate {
  if (!pfxBase64) throw new Error('Falta el contenido del certificado (PFX).');
  if (!password) throw new Error('Falta la contraseña del certificado PFX.');

  // Aceptar base64 limpio (ignora saltos de línea y prefijos data:)
  const b64 = pfxBase64.trim();
  const decoded = Buffer.from(b64, 'base64');
  if (decoded.length === 0) {
    throw new Error('El PFX no se pudo decodificar desde base64.');
  }

  let p12;
  try {
    // La AEAT sirve PFX a los que hay que parsear DER → ASN.1 → PKCS12.
    // Sin `asn1.fromDer` antes, pkcs12FromAsn1 recibe bytes crudos y descarta el PFX.
    p12 = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(forge.util.createBuffer(decoded.toString('binary'))),
      password,
    );
  } catch (err: any) {
    throw new Error(`No se pudo leer el PFX. Comprueba que la contraseña es correcta: ${err?.message || err}`);
  }

  // Extraer la primera clave privada y su certificado asociado
  const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ] || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ];

  if (!keyBag || keyBag.length === 0) {
    throw new Error('El PFX no contiene una clave privada válida.');
  }
  if (!certBags || certBags.length === 0) {
    throw new Error('El PFX no contiene un certificado.');
  }

  const privateKey = keyBag[0].key;
  if (!privateKey) {
    throw new Error('No se pudo extraer la clave privada del PFX.');
  }

  // Buscar el primer certificado válido (habitualmente el primero del PFX)
  const cert = certBags.map((b) => b.cert).find((c): c is NonNullable<typeof c> => Boolean(c));
  if (!cert) {
    throw new Error('El PFX no contiene certificados legibles.');
  }
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(privateKey);

  const subject = cert.subject.attributes
    .map((a: any) => `${a.name}=${a.value}`)
    .join(', ');

  const commonName =
    cert.subject.getField('CN')?.value ||
    cert.subject.getField('commonName')?.value ||
    '';

  const issuer = cert.issuer.attributes
    .map((a: any) => `${a.name}=${a.value}`)
    .join(', ');

  return {
    certPem,
    keyPem,
    subject,
    commonName,
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    issuer,
    serialNumber: cert.serialNumber,
  };
}

/** Comprueba si el certificado está dentro de su periodo de validez */
export function isCertificateValid(cert: ParsedCertificate, now = new Date()): boolean {
  return now >= cert.validFrom && now <= cert.validTo;
}

/**
 * Genera un https.Agent con el certificado de cliente para TLS.
 * Lazy-import de node:https para no romper el edge/browser build.
 */
export function createClientAgent(cert: ParsedCertificate): {
  agent: Agent;
  fingerprint: string;
} {
  const agent = new Agent({
    keepAlive: true,
    rejectUnauthorized: true,
    cert: cert.certPem,
    key: cert.keyPem,
  });
  return { agent, fingerprint: cert.serialNumber };
}