/**
 * Tipos TypeScript para el generador XML Veri*factu (Orden HAC/1177/2024).
 *
 * Estas interfaces modelan el XSD oficial `SuministroLRFacturasEmitidas.xsd`
 * de la AEAT. La estructura sigue la Guía Técnica de Veri*factu y está
 * centralizada aquí para que añadir/ajustar campos sea sencillo.
 */

/** Tipos de factura según el XSD de la AEAT */
export const TIPO_FACTURA = {
  /** Factura ordinaria */
  F1: 'F1',
  /** Factura simplificada */
  F2: 'F2',
  /** Factura emitida en sustitución de facturas simplificadas */
  F3: 'F3',
  /** Factura rectificativa por diferencias */
  R1: 'R1',
  /** Factura rectificativa por diferencias en sustitución */
  R2: 'R2',
  /** Factura rectificativa por sustitución */
  R3: 'R3',
  /** Factura rectificativa (cobros por cuenta de terceros) */
  R4: 'R4',
  /** Factura rectificativa art. 80.4 LIVA */
  R5: 'R5',
  /** Asiento de factura regularizador */
  F4: 'F4',
} as const;

export type TipoFactura = (typeof TIPO_FACTURA)[keyof typeof TIPO_FACTURA];

/** Claves de régimen especial o trascendencia para la operación */
export const CLAVE_REGIMEN = {
  /** Régimen general */
  GENERAL: '01',
  /** Exento (art. 20-25 LIVA y otros) */
  EXENTO: '02',
  /** Régimen especial de bienes usados */
  BIENES_USADOS: '03',
  /** Régimen especial de objetos de arte, antigüedades... */
  OBJETOS_ARTE: '04',
  /** Régimen especial de agricultura, ganadería y pesca */
  AGRICULTURA: '05',
  /** Régimen especial del oro de inversión */
  ORO_INVERSION: '06',
  /** Régimen especial de agencias de viajes */
  AGENCIAS_VIAJES: '07',
  /** Otros regímenes especiales (prestación de servicios, comercio minorista...) */
  OTROS: '08',
  /** Exportaciones */
  EXPORTACIONES: '09',
  /** Operaciones intracomunitarias */
  INTRACOMUNITARIAS: '10',
  /** Operaciones no sujetas */
  NO_SUJETAS: '11',
  /** IPD system */
  IPD_SYSTEM: '12',
} as const;

export type ClaveRegimen = (typeof CLAVE_REGIMEN)[keyof typeof CLAVE_REGIMEN];

/** Sistema de cálculo de IRPF */
export const SISTEMA_CALCULO_IRPF = {
  /** Sistema según coeficiente para autónomos */
  SISTEMA_COEFICIENTE: 'SistemaCritCoeficiente',
  /** Sistema según régimen de transparencia fiscal */
  TRANSPARENCIA_FISCAL: 'SistemaTransparenciaFiscal',
  /** Sistema según convenio fiscal */
  CONVENIO: 'SistemaConvenioFiscal',
  /** Si el dato no está disponible */
  NO_DISPONIBLE: 'NoDisponible',
} as const;

export type SistemaCalculoIRPF =
  (typeof SISTEMA_CALCULO_IRPF)[keyof typeof SISTEMA_CALCULO_IRPF];

/** Una línea de detalle con IVA (DetalleIVA) */
export interface DetalleIva {
  /** Tipo impositivo aplicado, p.ej. 21.00 */
  tipoImpositivo: number | string;
  /** Base imponible de la línea, p.ej. 100.00 */
  baseImponible: number | string;
  /** Cuota repercutida de la línea, p.ej. 21.00 */
  cuotaRepercutida: number | string;
}

/** Una retención (IRPF) */
export interface DetalleRetencion {
  /** Base de la retención */
  baseRetencion: number | string;
  /** Porcentaje de retención, p.ej. 15.00 */
  porcentajeRetencion: number | string;
  /** Importe de la retención resultante */
  importeRetencion: number | string;
}

/**
 * Datos del destinatario (cliente)
 */
export interface Destinatario {
  /** NIF del destinatario */
  nif: string;
  /** Nombre o razón social del destinatario */
  nombreRazonSocial: string;
  /** Código de país (ISO 3166-1 alpha-2), por defecto 'ES' */
  codigoPais?: string;
  /** Tipo de identificador: NIF (por defecto) */
  idType?: string;
}

/**
 * Datos de la factura anterior para el encadenamiento
 */
export interface EnlaceAnterior {
  /** Número de serie de la factura anterior */
  numSerieFactura: string;
  /** Fecha de expedición de la factura anterior (YYYY-MM-DD) */
  fechaExpedicionFactura: string;
  /** Huella SHA-256 de la factura anterior (64 caracteres mayúsculas) */
  huellaAnterior: string;
}

/** Parámetros para construir el XML de alta de una factura */
export interface AltaParams {
  /** Versión de trazabilidad del esquema (p.ej. '1.1') */
  idVersionTrazabilidad?: string;
  /** NIF del emisor (la empresa) */
  nifEmisor: string;
  /** Nombre o razón social del emisor */
  nombreRazonSocialEmisor?: string;
  /** Fecha/hora de generación del registro en ISO 8601 con huso */
  fechaHoraGenRegistro?: string;
  /** Ejercicio fiscal (YYYY) */
  ejercicio: number;
  /** Periodo impositivo (01-12) */
  periodo: string;

  // Identificación de la factura
  /** Número de serie de la factura, p.ej. 'F-2026-0001' */
  numeroFactura: string;
  /** Fecha de expedición de la factura (YYYY-MM-DD) */
  fechaExpedicion: string;

  // Datos de la factura
  tipoFactura: TipoFactura;
  claveRegimen: ClaveRegimen;
  descripcionOperacion: string;
  /** Fecha de la operación (YYYY-MM-DD), por defecto = fechaExpedicion */
  fechaOperacion?: string;
  /** Importe total en euros con 2 decimales */
  importeTotal: number | string;
  /** Base imponible total */
  baseImponible: number | string;
  /** Cuota repercutida total */
  cuotaRepercutida: number | string;
  /** Cuota de recargo de equivalencia (opcional) */
  cuotaRecargoEquivalencia?: number | string;
  /** Tipo de retención IRPF, p.ej. 15 */
  tipoRetencion?: number | string;
  /** Importe de la retención IRPF */
  importeRetencion?: number | string;
  /** Sistema de cálculo de IRPF */
  sistemaCalculoIRPF?: SistemaCalculoIRPF;
  /** Detalle de IVA por tramo */
  detalleIVA?: DetalleIva[];
  /** Detalle de retenciones */
  detalleRetenciones?: DetalleRetencion[];
  /** Destinatarios (clientes). Si no se pasa, se asume uno por defecto (NO existe factura sin destinatario en B2B) */
  destinatarios?: Destinatario[];

  // Encadenamiento
  /** Huella SHA-256 de esta factura */
  huella: string;
  /** Enlace con la factura anterior (si no es la primera) */
  enlaceAnterior?: EnlaceAnterior;

  // Rectificación
  /** Si es rectificativa, número de serie de la factura original */
  facturaRectificada?: {
    numSerieFactura: string;
    fechaExpedicionFactura: string;
  };
}

/** Parámetros para construir el XML de anulación de una factura */
export interface AnulacionParams {
  /** Versión de trazabilidad del esquema (p.ej. '1.1') */
  idVersionTrazabilidad?: string;
  /** NIF del emisor (la empresa) */
  nifEmisor: string;
  /** Nombre o razón social del emisor */
  nombreRazonSocialEmisor?: string;
  /** Fecha/hora de generación del registro */
  fechaHoraGenRegistro?: string;
  /** Ejercicio fiscal */
  ejercicio: number;
  /** Periodo impositivo (01-12) */
  periodo: string;

  // Identificación de la factura a anular
  /** Número de serie de la factura a anular */
  numeroFactura: string;
  /** Fecha de expedición de la factura a anular */
  fechaExpedicion: string;

  // Datos de la anulación
  /** Fecha de la operación (YYYY-MM-DD) */
  fechaOperacion?: string;
  /** Descripción de la anulación */
  descripcionOperacion?: string;
  /** Importe total de la factura anulada */
  importeTotal: number | string;

  // Encadenamiento
  huella: string;
  enlaceAnterior?: EnlaceAnterior;
}