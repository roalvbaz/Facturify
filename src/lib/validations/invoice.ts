import { z } from 'zod';

export const InvoiceLineSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitPriceCents: z.number().int("El precio unitario debe estar en céntimos enteros"),
  vatPercent: z.number().nonnegative("El porcentaje de IVA no puede ser negativo")
});

export const EmitInvoiceSchema = z.object({
  companyId: z.string().uuid("El ID de la empresa es inválido"),
  customerId: z.string().uuid("El ID del cliente es inválido").optional().nullable(),
  seriesCode: z.string().min(1, "El código de serie es obligatorio").default("F"),
  lines: z.array(InvoiceLineSchema).min(1, "La factura debe contener al menos una línea")
});

export type EmitInvoiceInput = z.infer<typeof EmitInvoiceSchema>;