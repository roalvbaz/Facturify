/**
 * Cliente SOAP para el envío de registros Veri*factu a la AEAT.
 *
 * Construye el sobre SOAP (SOAP 1.1) que envuelve el XML de `SuministroLRFacturasEmitidas`
 * y realiza la llamada al endpoint con el certificado digital de la empresa como
 * certificado de cliente TLS.
 */

import { XMLParser } from 'fast-xml-parser';
import { getVerifactuEndpoint, VerifactuEnvironment } from './endpoints';
import { SOAP_ENV_NS } from '../xml/constants';
import { parsePfx, createClientAgent } from '../certificate';

export interface VerifactuResponse {
  success: boolean;
  /** Código Seguro de Verificación devuelto por la AEAT */
  csv?: string;
  /** Estado global del envío */
  estadoEnvio?: 'Conforme' | 'NoConforme' | 'ParcialmenteCorrecto';
  /** Detalle de errores devueltos por AEAT */
  errores?: Array<{ codigo: string; descripcion: string }>;
  /** Cuerpo XML crudo de la respuesta (para debug/auditoría) */
  rawResponseXml?: string;
  /** Tiempo de respuesta en ms */
  elapsedMs?: number;
  /** Mensaje de error en caso de fallo de red/TLS */
  error?: string;
  /** HTTP status code */
  httpStatus?: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
});

/** Construye el sobre SOAP que envuelve el XML del suministro */
export function buildSoapEnvelope(xmlBody: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<soap:Envelope xmlns:soap="${SOAP_ENV_NS}" xmlns:xf="${'urn:agencia-tributaria:verifactu'}">\n` +
    `  <soap:Body>\n` +
    // Nota: el cuerpo SOAP del servicio SGFACB13UL envuelve el XML del suministro
    // dentro de una operación concreta. Se documenta aquí para ajustar a la WSDL real.
    `    <xf:enviarSuministroLRFacturasEmitidas>\n` +
    `${indentXML(xmlBody)}` +
    `    </xf:enviarSuministroLRFacturasEmitidas>\n` +
    `  </soap:Body>\n` +
    `</soap:Envelope>\n`
  );
}

function indentXML(xml: string, spaces = 4): string {
  const indent = ' '.repeat(spaces);
  return xml
    .split('\n')
    .map((line) => (line.trim() ? indent + line : line))
    .join('\n');
}

/** Extrae el estado/errores de la respuesta SOAP de la AEAT */
function parseSoapResponse(xml: string): {
  csv?: string;
  estado?: 'Conforme' | 'NoConforme' | 'ParcialmenteCorrecto';
  errores?: Array<{ codigo: string; descripcion: string }>;
} {
  try {
    const doc = parser.parse(xml);

    // Navega por la estructura: Envelope > Body > Respuesta
    const findAny = (obj: any, keys: string[]): any => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
      }
      for (const k of Object.keys(obj)) {
        const found = findAny(obj[k], keys);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    const csv = findAny(doc, ['CSV', 'csv', 'CodigoSeguroVerificacion']);
    const estado = findAny(doc, ['EstadoEnv', 'estadoEnv', 'estadoEnvio']);

    const errores: Array<{ codigo: string; descripcion: string }> = [];
    const errNodes = findAny(doc, ['Errores', 'ErroresRegistro', 'error']);
    if (errNodes) {
      const list = Array.isArray(errNodes) ? errNodes : [errNodes];
      for (const err of list) {
        const codigo = findAny(err, ['CodigoError', 'codigo', 'Codigo'])
          || findAny(err, ['@_CodigoError', 'Codigo'])
          || '';
        const descripcion = findAny(err, ['Descripcion', 'descripcion', 'DescripcionError'])
          || (typeof err === 'string' ? err : '');
        errores.push({
          codigo: String(codigo ?? ''),
          descripcion: String(descripcion ?? ''),
        });
      }
    }

    let estadoValue: VerifactuResponse['estadoEnvio'];
    if (estado) {
      const s = String(estado).toLowerCase();
      if (s.includes('conforme')) estadoValue = 'Conforme';
      else if (s.includes('parcialmente')) estadoValue = 'ParcialmenteCorrecto';
      else if (s.includes('no conforme') || s.includes('noconforme')) estadoValue = 'NoConforme';
    }

    return {
      csv: csv !== undefined ? String(csv) : undefined,
      estado: estadoValue,
      errores: errores.length ? errores : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Envía un XML de suministro Veri*factu a la AEAT.
 *
 * @param params.xmlBody - XML del suministro (buildAltaXML / buildAnulacionXML)
 * @param params.pfx      - contenido base64 del certificado (descifrado ya)
 * @param params.password - contraseña del PFX
 * @param params.environment - 'sandbox' | 'production'
 */
export async function submitToVerifactu(params: {
  xmlBody: string;
  pfxBase64: string;
  pfxPassword: string;
  environment?: VerifactuEnvironment;
}): Promise<VerifactuResponse> {
  const started = Date.now();
  const environment = params.environment || 'sandbox';
  const url = getVerifactuEndpoint(environment);

  // 1. Parsear certificado a PEM
  let cert;
  try {
    cert = parsePfx({
      pfxBase64: params.pfxBase64,
      password: params.pfxPassword,
    });
  } catch (err: any) {
    return {
      success: false,
      error: `Certificado inválido: ${err?.message || err}`,
      elapsedMs: Date.now() - started,
    };
  }

  // 2. Construir el sobre SOAP
  const soap = buildSoapEnvelope(params.xmlBody);

  // 3. Llamar al endpoint con el agente TLS de cliente
  let agent;
  try {
    const { agent: ag } = createClientAgent(cert);
    agent = ag;
  } catch (err: any) {
    return {
      success: false,
      error: `No se pudo preparar el certificado TLS: ${err?.message || err}`,
      elapsedMs: Date.now() - started,
    };
  }

  try {
    // En runtime Node (Render), fetch acepta el agente https con certificado
    // cliente. Se casta la RequestInit para incluir el campo `agent`.
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
        Accept: 'application/xml, text/xml;q=0.9',
      },
      body: soap,
      agent,
      // El handshake TLS con certificado cliente exige cache reutilizble
      cache: 'no-store',
    } as unknown as RequestInit;

    const res = await fetch(url, init);

    const rawBody = await res.text();
    const { csv, estado, errores } = parseSoapResponse(rawBody);

    const success = res.ok && estado !== 'NoConforme' && (estado === 'Conforme' || estado === 'ParcialmenteCorrecto' || !estado);

    return {
      success: success as boolean,
      csv,
      estadoEnvio: estado,
      errores,
      rawResponseXml: rawBody.slice(0, 4000),
      httpStatus: res.status,
      elapsedMs: Date.now() - started,
      error:
        !res.ok
          ? `HTTP ${res.status} ${res.statusText}`
          : (estado === 'NoConforme'
              ? 'La AEAT marcó el envío como No Conforme.'
              : errores && errores.length
                ? errores.map((e) => `${e.codigo}: ${e.descripcion}`).join('; ')
                : undefined),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red/TLS con la AEAT: ${err?.message || err}`,
      elapsedMs: Date.now() - started,
    };
  } finally {
    agent && (agent as any).destroy && (agent as any).destroy();
  }
}

/** Comprueba si el mensaje de error es reintentable (red/TLS/5xx) */
export function isRetryableError(res: VerifactuResponse): boolean {
  if (res.success) return false;
  if (res.error == null) return false;
  const msg = res.error.toLowerCase();
  const networkLike =
    msg.includes('timeout') ||
    msg.includes('enp') ||
    msg.includes('socket') ||
    msg.includes('econnreset') ||
    msg.includes('eai_again') ||
    msg.includes('fetch failed') ||
    msg.includes('404') ||
    msg.includes('502') ||
    msg.includes('503');
  // Errores de certificado (config del cliente) NO son reintentables
  const configLike = msg.includes('certificado') || msg.includes('pfx');
  return networkLike && !configLike;
}