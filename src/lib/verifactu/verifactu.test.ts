import { describe, it, expect } from 'vitest';
import { buildCanonicalString } from './canonical';
import { generateInvoiceHash } from './crypto';

describe('Motor Criptográfico Veri*factu', () => {
  it('debe generar la cadena canónica y el hash SHA-256 en mayúsculas', async () => {
    const canonical = buildCanonicalString({
      taxId: 'B12345678',
      formattedNumber: 'F-2026-0001',
      issueDate: '2026-08-17',
      totalCents: 12100,
      prevHash: '',
    });

    expect(canonical).toBe('B12345678&F-2026-0001&2026-08-17&121.00&');

    const hash = await generateInvoiceHash(canonical);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hash.toUpperCase());
  });
});