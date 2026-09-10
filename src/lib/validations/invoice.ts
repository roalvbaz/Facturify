import { z } from 'zod';

export const InvoiceLineSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitPriceCents: z.number().int("El precio unitario debe estar en céntimos enteros"),
  vatPercent: z.number().nonnegative("El porcentaje de IVA no puede ser negativo"),
});

export const EmitInvoiceSchema = z.object({
  companyId: z.string().uuid("El ID de la empresa es inválido"),
  customerId: z.string().uuid("El ID del cliente es inválido").optional().nullable(),
  seriesCode: z.string().min(1, "El código de serie es obligatorio").default("F"),
  lines: z.array(InvoiceLineSchema).min(1, "La factura debe contener al menos una línea"),
  dueDate: z.coerce.date(),
  issuedAt: z.coerce.date(),
}).refine((data) => {
  return data.dueDate >= data.issuedAt
  }, {
  message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión",
  path: ["dueDate"], // Esto marca el error específicamente en el campo de vencimiento
});


// Esquema para validar el Login con reCAPTCHA
export const LoginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  recaptchaToken: z.string().min(1, 'Por favor, completa la verificación de reCAPTCHA'),
});

// Esquema para el Registro inicial (creación de cuenta)
export const RegisterSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  recaptchaToken: z.string().min(1, 'Por favor, completa la verificación de reCAPTCHA'),
});

// Esquema para el endpoint de invitación (solo el email, sin contraseña)
export const InviteSchema = z.object({
  email: z.string().email('Formato de email inválido'),
});

// Esquema para la página pública de registro (?invite=...): el invitado
// crea su perfil (nombre) y fija su contraseña con reCAPTCHA.
export const RegisterRequestSchema = z.object({
  token: z.string().min(1, 'El enlace de invitación es necesario'),
  fullName: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  recaptchaToken: z.string().min(1, 'Por favor, completa la verificación de reCAPTCHA'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type InviteInput = z.infer<typeof InviteSchema>;
export type RegisterRequestInput = z.infer<typeof RegisterRequestSchema>;
export type EmitInvoiceInput = z.infer<typeof EmitInvoiceSchema>;