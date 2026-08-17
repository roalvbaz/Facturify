import { it, expect } from 'vitest';
import { construirUrlQr } from './qr';

it('debe generar la URL de cotejo de la AEAT formateada', () => {
  const url = construirUrlQr({
    emisorNif: 'B12345678',
    numeroFactura: 'F-2026-0001',
    fechaExpedicion: '2026-08-17',
    totalCentimos: 12100,
  });

  expect(url).toBe(
    'https://sede.agenciatributaria.gob.es/soporte/verifactu?nif=B12345678&numserie=F-2026-0001&fecha=17-08-2026&importe=121.00'
  );
});