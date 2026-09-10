/**
 * Generador de ficheros XML Veri*factu conformes al XSD de la AEAT
 * (`SuministroLRFacturasEmitidas.xsd`, Orden HAC/1177/2024).
 *
 * Genera el string XML para:
 *  - Alta de factura (RegistroAlta / FacturaEmitida)
 *  - Anulación de factura (RegistroAnulacion)
 *
 * El XML de salida se incrusta después en el sobre SOAP (ver ../soap/client.ts).
 * No depende de librerías XML: se construye con plantillas y escape correcto,
 * lo que mantiene el paquete ligero y el control total sobre el formato.
 */

import {
  AltaParams,
  AnulacionParams,
  DetalleIva,
  Destinatario,
} from './types';
import {
  VF_NS,
  XSI_NS,
  DEFAULT_ID_VERSION,
  DEFAULT_HUSO,
  formatDecimal,
} from './constants';

/** Escapa caracteres especiales XML dentro de valores de texto */
function xmlEscape(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Fecha ISO actual con huso (por defecto) para FechaHoraHusoGenRegistro */
export function nowWithZone(zone: string = DEFAULT_HUSO): string {
  const now = new Date();
  const iso = now.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  return `${iso.replace(/\.\d{3}Z$/, '')}${zone}`;
}

/** Convierte una fecha YYYY-MM-DD a elemento Ejercicio/Periodo */
function periodoDeFecha(fechaISO: string): { ejercicio: number; periodo: string } {
  const [year, month] = fechaISO.split('-');
  return {
    ejercicio: parseInt(year, 10),
    periodo: month,
  };
}

/** Escapa y valida una fecha en formato YYYY-MM-DD */
function sanitizeFecha(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Fecha no válida (se espera YYYY-MM-DD): "${value}"`);
  }
  return value;
}

function nifNode(nif: string, name = 'NIF'): string {
  return `<${name}>${xmlEscape(nif.trim().toUpperCase())}</${name}>`;
}

function obligadoEmisionXML(nifEmisor: string, nombreRazonSocial?: string): string {
  const nombre = nombreRazonSocial?.trim()
    ? `  <NombreRazonSocial>${xmlEscape(nombreRazonSocial.trim())}</NombreRazonSocial>\n`
    : '';
  return `  <ObligadoEmision>\n${nifNode(nifEmisor, 'NIF')}\n${nombre}  </ObligadoEmision>\n`;
}

function cabeceraXML(params: { nifEmisor: string; nombreRazonSocialEmisor?: string; fechaHoraGenRegistro?: string; idVersionTrazabilidad?: string; }): string {
  return `<Cabecera>\n` +
    `  <IDVersionTrazabilidad>${xmlEscape(params.idVersionTrazabilidad || DEFAULT_ID_VERSION)}</IDVersionTrazabilidad>\n` +
    obligadoEmisionXML(params.nifEmisor, params.nombreRazonSocialEmisor) +
    `  <FechaHoraHusoGenRegistro>${xmlEscape(params.fechaHoraGenRegistro || nowWithZone())}</FechaHoraHusoGenRegistro>\n` +
    `</Cabecera>\n`;
}

function periodoImpositivoXML(ejercicio: number, periodo: string): string {
  return `<PeriodoImpositivo>\n  <Ejercicio>${ejercicio}</Ejercicio>\n  <Periodo>${xmlEscape(periodo)}</Periodo>\n</PeriodoImpositivo>\n`;
}

function idFacturaXML(nifEmisor: string, numeroFactura: string, fechaExpedicion: string): string {
  return `<IDFactura>\n` +
    `  <IDEmisorFactura>\n${nifNode(nifEmisor, 'NIF')}\n  </IDEmisorFactura>\n` +
    `  <NumSerieFactura>${xmlEscape(numeroFactura)}</NumSerieFactura>\n` +
    `  <FechaExpedicionFactura>${sanitizeFecha(fechaExpedicion)}</FechaExpedicionFactura>\n` +
    `</IDFactura>\n`;
}

function destinatariosXML(destinatarios: Destinatario[]): string {
  if (!destinatarios || destinatarios.length === 0) return '';
  if (destinatarios.length > 1) {
    // Veri*factu admite un único destinatario por registro en la práctica.
    // Si se pasan varios, se emite cada uno; AEAT validará en sandbox.
  }
  const items = destinatarios
    .map((d) => {
      const pais = d.codigoPais || 'ES';
      const idType = (d.idType || 'NIF').toUpperCase();
      // En el XSD, IDDestinatario contiene un bloque "ID" tipado: NIF o IDOtro
      const idBlock =
        idType === 'NIF'
          ? `      <NIF>${xmlEscape(d.nif.trim().toUpperCase())}</NIF>\n`
          : `      <IDOtro>\n        <ID>${xmlEscape(d.nif)}</ID>\n        <CodigoPais>${xmlEscape(pais)}</CodigoPais>\n      </IDOtro>\n`;
      return `    <IDDestinatario>\n${idBlock}` +
        `      <NombreRazonSocial>${xmlEscape(d.nombreRazonSocial)}</NombreRazonSocial>\n` +
        `      <CodigoPais>${xmlEscape(pais)}</CodigoPais>\n` +
        `    </IDDestinatario>`;
    })
    .join('\n');
  return `  <Destinatarios>\n${items}\n  </Destinatarios>\n`;
}

function detalleIvaXML(detalle: DetalleIva[]): string {
  if (!detalle || detalle.length === 0) return '';
  const items = detalle
    .map((d) =>
      `  <DetalleIVA>\n` +
      `    <TipoImpositivo>${formatDecimal(d.tipoImpositivo)}</TipoImpositivo>\n` +
      `    <BaseImponible>${formatDecimal(d.baseImponible)}</BaseImponible>\n` +
      `    <CuotaRepercutida>${formatDecimal(d.cuotaRepercutida)}</CuotaRepercutida>\n` +
      `  </DetalleIVA>`
    )
    .join('\n');
  return `  <DesgloseIVA>\n${items}\n  </DesgloseIVA>\n`;
}

function detalleRetencionesXML(
  tipoRetencion?: number | string,
  importeRetencion?: number | string,
  detalles?: Array<{ baseRetencion: number | string; porcentajeRetencion: number | string; importeRetencion: number | string }>
): string {
  // Si hay una retención global (SistemaCritCoeficiente), se emite TipoRetencion/ImporteRetencion
  const global = tipoRetencion != null || importeRetencion != null;
  // Detalle por base (librerías contables suelen desglosar)
  const detallado = detalles && detalles.length > 0;

  if (!global && !detallado) return '';

  let out = '  <Retenciones>\n';
  if (global) {
    out += `    <TipoRetencion>${formatDecimal(tipoRetencion ?? 0)}</TipoRetencion>\n`;
    if (importeRetencion != null) {
      out += `    <ImporteRetencion>${formatDecimal(importeRetencion)}</ImporteRetencion>\n`;
    }
  }
  if (detallado) {
    for (const d of detalles!) {
      out += `    <DetalleRetencion>\n` +
        `      <BaseRetencion>${formatDecimal(d.baseRetencion)}</BaseRetencion>\n` +
        `      <PorcentajeRetencion>${formatDecimal(d.porcentajeRetencion)}</PorcentajeRetencion>\n` +
        `      <ImporteRetencion>${formatDecimal(d.importeRetencion)}</ImporteRetencion>\n` +
        `    </DetalleRetencion>\n`;
    }
  }
  out += '  </Retenciones>\n';
  return out;
}

function datosVinculadosXML(huella: string, enlaceAnterior?: AltaParams['enlaceAnterior']): string {
  if (!huella || huella.length !== 64) {
    throw new Error(`La huella debe ser un SHA-256 de 64 caracteres. Recibido: "${huella}" (${huella.length})`);
  }
  let out = '  <DatosVinculados>\n';
  // Remisión voluntaria: se envía cada factura de forma individual e inmediata,
  // por lo que no hay fecha fin de periodo.
  out += `    <RemisionVoluntaria>\n      <FechaHoraHasta>${nowWithZone()}</FechaHoraHasta>\n` +
    `      <FechaFinPeriodoFactura>${sanitizeFecha(new Date().toISOString().slice(0, 10))}</FechaFinPeriodoFactura>\n` +
    `    </RemisionVoluntaria>\n`;
  out += `    <Huella>${huella}</Huella>\n`;

  if (enlaceAnterior) {
    out += `    <Encadenamiento>\n` +
      `      <IDAnterior>\n` +
      `        <NumSerieFactura>${xmlEscape(enlaceAnterior.numSerieFactura)}</NumSerieFactura>\n` +
      `        <FechaExpedicionFactura>${sanitizeFecha(enlaceAnterior.fechaExpedicionFactura)}</FechaExpedicionFactura>\n` +
      `      </IDAnterior>\n` +
      `      <HuellaAnterior>${xmlEscape(enlaceAnterior.huellaAnterior)}</HuellaAnterior>\n` +
      `    </Encadenamiento>\n`;
  }

  out += '  </DatosVinculados>\n';
  return out;
}

/**
 * Construye el XML de cuerpo (sin sobre SOAP) para el alta de una factura.
 */
export function buildAltaXML(params: AltaParams): string {
  const ejercicio = params.ejercicio ?? parseInt(params.fechaExpedicion.slice(0, 4), 10);
  const periodo = params.periodo ?? params.fechaExpedicion.slice(5, 7);
  const fechaOperacion = sanitizeFecha(params.fechaOperacion || params.fechaExpedicion);

  const tipoRectificativa =
    params.tipoFactura.startsWith('R')
      ? `  <TipoRectificativa>\n    <TipoRectificativo>${params.tipoFactura === 'R1' || params.tipoFactura === 'R2' ? 'D' : 'S'}</TipoRectificativo>\n` +
        (params.facturaRectificada
          ? `    <IdentifFacturaRectificada>\n      <IDFactura>\n        <IDEmisorFactura>\n${nifNode(params.nifEmisor, 'NIF')}\n        </IDEmisorFactura>\n        <NumSerieFactura>${xmlEscape(params.facturaRectificada.numSerieFactura)}</NumSerieFactura>\n        <FechaExpedicionFactura>${sanitizeFecha(params.facturaRectificada.fechaExpedicionFactura)}</FechaExpedicionFactura>\n      </IDFactura>\n    </IdentifFacturaRectificada>\n`
          : '') +
        `  </TipoRectificativa>\n`
      : '';

  const facturaEmitidaBlocks =
    `  <FacturaEmitida>\n` +
    `    <TipoFactura>${xmlEscape(params.tipoFactura)}</TipoFactura>\n` +
    `    <ClaveRegimenEspecialOTrascendencia>${xmlEscape(params.claveRegimen)}</ClaveRegimenEspecialOTrascendencia>\n` +
    `    <DescripcionOperacion>${xmlEscape(params.descripcionOperacion)}</DescripcionOperacion>\n` +
    `    <FechaOperacion>${fechaOperacion}</FechaOperacion>\n` +
    `    <ImporteTotal>${formatDecimal(params.importeTotal)}</ImporteTotal>\n` +
    `    <BaseImponible>${formatDecimal(params.baseImponible)}</BaseImponible>\n` +
    `    <CuotaRepercutida>${formatDecimal(params.cuotaRepercutida)}</CuotaRepercutida>\n` +
    (params.cuotaRecargoEquivalencia != null
      ? `    <CuotaRecargoEquivalencia>${formatDecimal(params.cuotaRecargoEquivalencia)}</CuotaRecargoEquivalencia>\n`
      : '') +
    (params.sistemaCalculoIRPF
      ? `    <SistemaCalculoIRPF>${xmlEscape(params.sistemaCalculoIRPF)}</SistemaCalculoIRPF>\n`
      : '') +
    detalleIvaXML(params.detalleIVA || defaultDetalleIVA(params)) +
    detalleRetencionesXML(params.tipoRetencion, params.importeRetencion, params.detalleRetenciones) +
    destinatariosXML(params.destinatarios || []) +
    `  </FacturaEmitida>\n`;

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<SuministroLRFacturasEmitidas xmlns="${VF_NS}" xmlns:xsi="${XSI_NS}">\n` +
    cabeceraXML({ nifEmisor: params.nifEmisor, nombreRazonSocialEmisor: params.nombreRazonSocialEmisor, fechaHoraGenRegistro: params.fechaHoraGenRegistro, idVersionTrazabilidad: params.idVersionTrazabilidad }) +
    `  <RegistroLRFacturasEmitidas>\n` +
    periodoImpositivoXML(ejercicio, periodo) +
    idFacturaXML(params.nifEmisor, params.numeroFactura, params.fechaExpedicion) +
    tipoRectificativa +
    facturaEmitidaBlocks +
    datosVinculadosXML(params.huella, params.enlaceAnterior) +
    `  </RegistroLRFacturasEmitidas>\n` +
    `</SuministroLRFacturasEmitidas>\n`;
}

/** Detalle IVA por defecto: un único tramo con el total aplicado */
function defaultDetalleIVA(params: AltaParams): DetalleIva[] {
  const base = parseFloat(String(params.baseImponible));
  const cuota = parseFloat(String(params.cuotaRepercutida));
  if (base <= 0 && cuota <= 0) return [];
  // Si el total cuadra con un IVA único, lo usamos; si no, emite un tramo genérico 0
  // para que el XML sea estructuralmente válido (el detalle por tramos se pasa por params.detalleIVA).
  const tasa = base > 0 ? Math.round((cuota / base) * 10000) / 100 : 0;
  return [{
    tipoImpositivo: tasa,
    baseImponible: base,
    cuotaRepercutida: cuota,
  }];
}

/**
 * Construye el XML de cuerpo (sin sobre SOAP) para la anulación de una factura.
 */
export function buildAnulacionXML(params: AnulacionParams): string {
  const ejercicio = params.ejercicio ?? parseInt(params.fechaExpedicion.slice(0, 4), 10);
  const periodo = params.periodo ?? params.fechaExpedicion.slice(5, 7);
  const fechaOperacion = sanitizeFecha(params.fechaOperacion || new Date().toISOString().slice(0, 10));

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<SuministroLRFacturasEmitidas xmlns="${VF_NS}" xmlns:xsi="${XSI_NS}">\n` +
    cabeceraXML({ nifEmisor: params.nifEmisor, nombreRazonSocialEmisor: params.nombreRazonSocialEmisor, fechaHoraGenRegistro: params.fechaHoraGenRegistro, idVersionTrazabilidad: params.idVersionTrazabilidad }) +
    `  <RegistroLRFacturasEmitidas>\n` +
    periodoImpositivoXML(ejercicio, periodo) +
    idFacturaXML(params.nifEmisor, params.numeroFactura, params.fechaExpedicion) +
    `  <RegistroAnulacion>\n` +
    `    <FechaOperacion>${fechaOperacion}</FechaOperacion>\n` +
    `    <DescripcionOperacion>${xmlEscape(params.descripcionOperacion || `Anulación de la factura ${params.numeroFactura}`)}</DescripcionOperacion>\n` +
    `    <ImporteTotal>${formatDecimal(params.importeTotal)}</ImporteTotal>\n` +
    `  </RegistroAnulacion>\n` +
    datosVinculadosXML(params.huella, params.enlaceAnterior) +
    `  </RegistroLRFacturasEmitidas>\n` +
    `</SuministroLRFacturasEmitidas>\n`;
}

/**
 * Sujeto pasivo del emisor: NIF normalizado.
 * Exportado para testeo fácil.
 */
export function normalizeNif(nif: string): string {
  return nif.trim().toUpperCase();
}