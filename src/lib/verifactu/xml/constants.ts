/**
 * Constantes y dominios del esquema Veri*factu.
 *
 * Los namespaces y valores de dominio se centralizan aquí. Si la AEAT
 * publica una nueva versión del XSD, es el único archivo que habrá que ajustar.
 */

/** Namespace raíz del documento `SuministroLRFacturasEmitidas` */
export const VF_NS = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/sii/Desarrollo/verifactu/SuministroLRFacturasEmitidas.xsd';
/** Namespace estándar de factura electrónica europea (para NIF/países) */
export const NF_NS = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/djjc/facturaelectricas/plugin/verifactu/LeerConceptosVeriFactu.xsd';
/** Namespace SOAP para el sobre */
export const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
/** Namespace XML Schema */
export const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

/** Versión por defecto de trazabilidad del esquema */
export const DEFAULT_ID_VERSION = '1.1';

/** Huso horario de generación del registro */
export const DEFAULT_HUSO = '+02:00';

/**
 * Formatea un número con exactamente 2 decimales usando coma española.
 * La AEAT exige el separador decimal como punto (.) en el XML.
 */
export function formatDecimal(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) {
    throw new Error(`Valor no numérico para formateo Veri*factu: "${value}"`);
  }
  // El XSD utiliza '.' como separador decimal
  return num.toFixed(2);
}