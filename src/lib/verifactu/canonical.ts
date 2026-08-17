export interface CanonicalParams {
  taxId: string;
  formattedNumber: string;
  issueDate: string; // Formato YYYY-MM-DD o ISO string
  totalCents: number;
  prevHash?: string | null;
}

/**
 * Normaliza y concatena los campos requeridos para la huella fiscal Veri*factu.
 * Formato: NIF&NUMERO&FECHA&TOTAL&HASH_ANTERIOR
 */
export function buildCanonicalString(params: CanonicalParams): string {
  const { taxId, formattedNumber, issueDate, totalCents, prevHash } = params;

  // 1. Limpieza de espacios en NIF y número
  const cleanTaxId = taxId.trim().toUpperCase();
  const cleanNumber = formattedNumber.trim();

  // 2. Extraer solo la fecha YYYY-MM-DD en caso de recibir un ISO completo
  const cleanDate = issueDate.includes('T') ? issueDate.split('T')[0] : issueDate.trim();

  // 3. Conversión estricta de céntimos enteros a decimal con 2 cifras fijas (ej. 12100 -> "121.00")
  const formattedTotal = (totalCents / 100).toFixed(2);

  // 4. Si es la primera factura de la serie, el hash anterior es cadena vacía
  const cleanPrevHash = (prevHash ?? '').trim();

  return `${cleanTaxId}&${cleanNumber}&${cleanDate}&${formattedTotal}&${cleanPrevHash}`;
}