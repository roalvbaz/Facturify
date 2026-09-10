/**
 * Endpoints del servicio web Veri*factu de la AEAT (SOAP).
 *
 * - Preproducción (sandbox/pruebas): preapiw
 * - Producción: sede electrónica
 *
 * El servicio se llama "ProxyAplicacion" del módulo SGFACB13UL.
 */

export const VERIFACTU_ENDPOINTS = {
  sandbox: 'https://preapiw.aeat.es/wlPL/SGFACB13UL/ProxyAplicacion/ProxyService',
  production: 'https://sede.agenciatributaria.gob.es/wlPL/SGFACB13UL/ProxyAplicacion/ProxyService',
} as const;

export type VerifactuEnvironment = keyof typeof VERIFACTU_ENDPOINTS;

/** Devuelve la URL del endpoint según el entorno */
export function getVerifactuEndpoint(env: VerifactuEnvironment = 'sandbox'): string {
  return VERIFACTU_ENDPOINTS[env] || VERIFACTU_ENDPOINTS.sandbox;
}

/** WS prefix del servicio (no-op documentativo) */
export const OPERATION_ENVIAR_FACTURAS_EMITIDAS = 'enviarSuministroLRFacturasEmitidas';