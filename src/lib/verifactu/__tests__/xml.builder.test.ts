/**
 * Tests del generador XML Veri*factu (buildAltaXML / buildAnulacionXML).
 *
 * Validan la estructura del XML según la Orden HAC/1177/2024:
 *  - Raíz SuministroLRFacturasEmitidas con namespace oficial
 *  - Uso de comas/puntos decimales correctos, hash de 64 chars, encadenamiento
 *  - Escape de caracteres especiales
 *  - Derivación de Ejercicio/Periodo desde la fecha
 *  - Anulación usa RegistroAnulacion (no FacturaEmitida)
 */

import { it, expect, describe } from 'vitest';
import { buildAltaXML, buildAnulacionXML } from '../xml/builder';
import { VF_NS, formatDecimal } from '../xml/constants';
import { CLAVE_REGIMEN } from '../xml/types';

const SHA256_64 = 'a'.repeat(64); // huella válida de 64 caracteres
const ANTERIOR_SHA256_64 = 'b'.repeat(64);

const baseParams = {
  nifEmisor: 'B12345678',
  nombreRazonSocialEmisor: 'Facturify S.L.',
  ejercicio: 2026,
  periodo: '08',
  numeroFactura: 'F-2026-0001',
  fechaExpedicion: '2026-08-17',
  tipoFactura: 'F1' as const,
  claveRegimen: CLAVE_REGIMEN.GENERAL,
  descripcionOperacion: 'Servicios de consultoría',
  importeTotal: 121.0,
  baseImponible: 100.0,
  cuotaRepercutida: 21.0,
  huella: SHA256_64,
  destinatarios: [{ nif: 'B98765432', nombreRazonSocial: 'Cliente S.A.' }],
};

describe('buildAltaXML', () => {
  it('genera un XML con raíz SuministroLRFacturasEmitidas y namespace oficial', () => {
    const xml = buildAltaXML(baseParams);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<SuministroLRFacturasEmitidas');
    expect(xml).toContain(`xmlns="${VF_NS}"`);
  });

  it('incluye cabecera con versión de trazabilidad y obligado emisión', () => {
    const xml = buildAltaXML(baseParams);
    expect(xml).toContain('<IDVersionTrazabilidad>1.1</IDVersionTrazabilidad>');
    expect(xml).toContain('<ObligadoEmision>');
    expect(xml).toContain('<NIF>B12345678</NIF>');
    expect(xml).toContain('<NombreRazonSocial>Facturify S.L.</NombreRazonSocial>');
  });

  it('identifica la factura con número y fecha', () => {
    const xml = buildAltaXML(baseParams);
    expect(xml).toContain('<IDFactura>');
    expect(xml).toContain('<NumSerieFactura>F-2026-0001</NumSerieFactura>');
    expect(xml).toContain('<FechaExpedicionFactura>2026-08-17</FechaExpedicionFactura>');
  });

  it('emite TipoFactura F1 y ClaveRegimenEspecialOTrascendencia 01', () => {
    const xml = buildAltaXML(baseParams);
    expect(xml).toContain('<TipoFactura>F1</TipoFactura>');
    expect(xml).toContain('<ClaveRegimenEspecialOTrascendencia>01</ClaveRegimenEspecialOTrascendencia>');
  });

  it('formatea los importes con 2 decimales y punto decimal', () => {
    const xml = buildAltaXML(baseParams);
    expect(xml).toContain('<ImporteTotal>121.00</ImporteTotal>');
    expect(xml).toContain('<BaseImponible>100.00</BaseImponible>');
    expect(xml).toContain('<CuotaRepercutida>21.00</CuotaRepercutida>');
  });

  it('incluye el desglose de IVA', () => {
    const xml = buildAltaXML({
      ...baseParams,
      detalleIVA: [
        { tipoImpositivo: 21, baseImponible: 100, cuotaRepercutida: 21 },
      ],
    });
    expect(xml).toContain('<DesgloseIVA>');
    expect(xml).toContain('<TipoImpositivo>21.00</TipoImpositivo>');
    expect(xml).toContain('<BaseImponible>100.00</BaseImponible>');
  });

  it('incluye el destinatario con NIF normalizado en mayúsculas', () => {
    const xml = buildAltaXML({
      ...baseParams,
      destinatarios: [{ nif: 'b98765432', nombreRazonSocial: 'Cliente S.A.' }],
    });
    expect(xml).toContain('<Destinatarios>');
    expect(xml).toContain('<NIF>B98765432</NIF>');
    expect(xml).toContain('<NombreRazonSocial>Cliente S.A.</NombreRazonSocial>');
  });

  it('incluye la huella SHA-256 de 64 caracteres en DatosVinculados', () => {
    const xml = buildAltaXML(baseParams);
    const m = xml.match(/<Huella>([0-9a-fA-F]{64})<\/Huella>/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(SHA256_64);
  });

  it('incluye el encadenamiento con la factura anterior', () => {
    const xml = buildAltaXML({
      ...baseParams,
      enlaceAnterior: {
        numSerieFactura: 'F-2026-0000',
        fechaExpedicionFactura: '2026-08-01',
        huellaAnterior: ANTERIOR_SHA256_64,
      },
    });
    expect(xml).toContain('<Encadenamiento>');
    expect(xml).toContain('<NumSerieFactura>F-2026-0000</NumSerieFactura>');
    expect(xml).toContain(`<HuellaAnterior>${ANTERIOR_SHA256_64}</HuellaAnterior>`);
  });

  it('deriva Ejercicio y Periodo de la fecha si no se pasan', () => {
    const xml = buildAltaXML({
      ...baseParams,
      ejercicio: undefined as any,
      periodo: undefined as any,
      fechaExpedicion: '2026-07-15',
    });
    expect(xml).toContain('<Ejercicio>2026</Ejercicio>');
    expect(xml).toContain('<Periodo>07</Periodo>');
  });

  it('escapa caracteres especiales XML en descripciones y nombres', () => {
    const xml = buildAltaXML({
      ...baseParams,
      descripcionOperacion: 'Servicio A&B <urgente> & "comillas"',
      numeroFactura: 'F-2026-0001',
    });
    expect(xml).toContain('Servicio A&amp;B &lt;urgente&gt; &amp; &quot;comillas&quot;');
    expect(xml).not.toContain('<urgente>');
  });

  it('emite TipoRectificativa con bloque IdentifFacturaRectificada para R1', () => {
    const xml = buildAltaXML({
      ...baseParams,
      tipoFactura: 'R1',
      facturaRectificada: {
        numSerieFactura: 'F-2026-0001',
        fechaExpedicionFactura: '2026-08-10',
      },
    });
    expect(xml).toContain('<TipoRectificativa>');
    expect(xml).toContain('<TipoRectificativo>D</TipoRectificativo>');
    expect(xml).toContain('<IdentifFacturaRectificada>');
    expect(xml).toContain('<NumSerieFactura>F-2026-0001</NumSerieFactura>');
  });

  it('lanza si la huella no tiene 64 caracteres', () => {
    expect(() => buildAltaXML({ ...baseParams, huella: 'abc' })).toThrow(/64 caracteres/);
  });

  it('lanza si la fecha de expedición no tiene formato YYYY-MM-DD', () => {
    expect(() => buildAltaXML({ ...baseParams, fechaExpedicion: '17/08/2026' })).toThrow(
      /Fecha no válida/
    );
  });
});

describe('buildAnulacionXML', () => {
  const anulaParams = {
    nifEmisor: 'B12345678',
    numeroFactura: 'F-2026-0001',
    fechaExpedicion: '2026-08-17',
    ejercicio: 2026,
    periodo: '08',
    importeTotal: 121.0,
    huella: SHA256_64,
  };

  it('incluye RegistroAnulacion y la descripción por defecto', () => {
    const xml = buildAnulacionXML(anulaParams);
    expect(xml).toContain('<RegistroAnulacion>');
    expect(xml).toContain(`Anulación de la factura F-2026-0001`);
    expect(xml).toContain('<ImporteTotal>121.00</ImporteTotal>');
  });

  it('no emite FacturaEmitida en una anulación', () => {
    const xml = buildAnulacionXML(anulaParams);
    expect(xml).not.toContain('<FacturaEmitida>');
    expect(xml).not.toContain('<TipoFactura>');
  });

  it('incluye la huella en DatosVinculados', () => {
    const xml = buildAnulacionXML(anulaParams);
    const m = xml.match(/<Huella>([0-9a-fA-F]{64})<\/Huella>/);
    expect(m).not.toBeNull();
  });
});

describe('formatDecimal', () => {
  it('lanza con valor no numérico', () => {
    expect(() => formatDecimal('no-numérico')).toThrow(/no numérico/i);
  });
});