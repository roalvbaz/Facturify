import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  jsonb,
  numeric,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. EMPRESAS (COMPANIES)
// ==========================================
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tax_id: varchar('tax_id', { length: 64 }).notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  postal_code: varchar('postal_code', { length: 16 }),
  city: text('city'),
  verifactu_enabled: boolean('verifactu_enabled').default(true).notNull(),
  fiscal_config: jsonb('fiscal_config'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 2. MIEMBROS DE EMPRESA (COMPANY_MEMBERS)
// ==========================================
export const company_members = pgTable(
  'company_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: uuid('user_id').notNull(),
    role: varchar('role', { length: 32 }).notNull().default('MEMBER'), // 'OWNER', 'ADMIN', 'MEMBER'
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    companyUserIdx: uniqueIndex('company_user_idx').on(
      table.company_id,
      table.user_id
    ),
  })
);

// ==========================================
// 3. CLIENTES (CUSTOMERS)
// ==========================================
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  tax_id: varchar('tax_id', { length: 64 }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  postal_code: varchar('postal_code', { length: 16 }),
  city: text('city'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  telephone: text('telephone'),
  email: text('email'),
  is_active: boolean("is_active").default(true).notNull(),
});

// ==========================================
// 4. SERIES DE FACTURACIÓN (INVOICE_SERIES)
// ==========================================
export const invoice_series = pgTable(
  'invoice_series',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    series_code: varchar('series_code', { length: 32 }).notNull(),
    year: integer('year').notNull(),
    last_number: integer('last_number').default(0).notNull(),
    last_hash: text('last_hash').default('').notNull(), // Para encadenamiento SHA-256
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    seriesYearIdx: uniqueIndex('series_company_code_year_idx').on(
      table.company_id,
      table.series_code,
      table.year
    ),
  })
);

// ==========================================
// 5. FACTURAS (INVOICES)
// ==========================================
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .references(() => companies.id, { onDelete: 'restrict' })
      .notNull(),
    customer_id: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'set null' }),
    series_code: varchar('series_code', { length: 32 }).notNull(),
    year: integer('year').notNull(),
    number: integer('number').notNull(),
    formatted_number: varchar('formatted_number', { length: 64 }).notNull(), // Ej: "F-2026-0001" o "R-2026-0001"
    issued_at: timestamp('issued_at').defaultNow().notNull(),
    due_date: timestamp('due_date'),
    status: varchar('status', { length: 32 }).default('Pendiente').notNull(),

    // Campos de Rectificación (RD 1619/2012 & Veri*factu)
    rectifies_invoice_id: uuid('rectifies_invoice_id')
      .references((): any => invoices.id, { onDelete: 'set null' }),
    rectification_type: varchar('rectification_type', { length: 32 }), // 'DIFERENCIAS' | 'SUSTITUCION'
    rectification_reason: text('rectification_reason'), // Ej: 'R1 - Error fundado en derecho'

    // Campos de encadenamiento e integridad Veri*factu
    prev_hash: text('prev_hash'),
    current_hash: text('current_hash'),
    canonical_string: text('canonical_string'),
    qr_code_url: text('qr_code_url'),

    // Importes en céntimos
    subtotal_cents: integer('subtotal_cents').default(0).notNull(),
    vat_total_cents: integer('vat_total_cents').default(0).notNull(),
    total_cents: integer('total_cents').default(0).notNull(),
    currency: varchar('currency', { length: 8 }).default('EUR').notNull(),

    created_at: timestamp('created_at').defaultNow().notNull(),
    is_locked: boolean('is_locked').default(true).notNull(),
  },
  (table) => ({
    invoiceNumberIdx: uniqueIndex('invoice_company_series_number_idx').on(
      table.company_id,
      table.series_code,
      table.number,
      table.year
    ),
  })
);

// ==========================================
// 6. LÍNEAS DE FACTURA (INVOICE_LINES)
// ==========================================
export const invoice_lines = pgTable('invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  line_index: integer('line_index').default(0).notNull(),
  description: text('description'),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).default('1').notNull(),
  unit_price_cents: integer('unit_price_cents').default(0).notNull(),
  vat_percent: numeric('vat_percent', { precision: 5, scale: 2 }).notNull(),
  vat_amount_cents: integer('vat_amount_cents').default(0).notNull(),
  total_amount_cents: integer('total_amount_cents').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 7. GASTOS Y COMPRAS (EXPENSES)
// ==========================================
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  supplier_name: text('supplier_name').notNull(),
  supplier_tax_id: varchar('supplier_tax_id', { length: 64 }),
  invoice_reference: varchar('invoice_reference', { length: 64 }), // Nº de factura del proveedor o ticket
  expense_date: timestamp('expense_date').defaultNow().notNull(),
  category: varchar('category', { length: 64 }).default('General').notNull(), // 'Suministros', 'Software', 'Alquiler', 'Dietas', etc.
  description: text('description'),
  
  // Importes
  subtotal_cents: integer('subtotal_cents').default(0).notNull(),
  vat_percent: numeric('vat_percent', { precision: 5, scale: 2 }).default('21').notNull(),
  vat_amount_cents: integer('vat_amount_cents').default(0).notNull(),
  irpf_percent: numeric('irpf_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  irpf_amount_cents: integer('irpf_amount_cents').default(0).notNull(),
  total_cents: integer('total_cents').default(0).notNull(),
  
  payment_method: varchar('payment_method', { length: 32 }).default('TRANSFERENCIA'),
  status: varchar('status', { length: 32 }).default('Pagado').notNull(), // 'Pagado' | 'Pendiente'
  receipt_url: text('receipt_url'), // Enlace al PDF/Foto del ticket subido a Supabase Storage
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 8. PRESUPUESTOS (ESTIMATES)
// ==========================================
export const estimates = pgTable('estimates', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  customer_id: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'set null' }),
  formatted_number: varchar('formatted_number', { length: 64 }).notNull(), // Ej: "P-2026-0001"
  issued_at: timestamp('issued_at').defaultNow().notNull(),
  expiry_date: timestamp('expiry_date'),
  status: varchar('status', { length: 32 }).default('Borrador').notNull(), // 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado' | 'Facturado'
  converted_invoice_id: uuid('converted_invoice_id')
    .references(() => invoices.id, { onDelete: 'set null' }), // Enlace a la factura generada tras aprobar
  subtotal_cents: integer('subtotal_cents').default(0).notNull(),
  vat_total_cents: integer('vat_total_cents').default(0).notNull(),
  total_cents: integer('total_cents').default(0).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const estimate_lines = pgTable('estimate_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimate_id: uuid('estimate_id')
    .references(() => estimates.id, { onDelete: 'cascade' })
    .notNull(),
  description: text('description'),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).default('1').notNull(),
  unit_price_cents: integer('unit_price_cents').default(0).notNull(),
  vat_percent: numeric('vat_percent', { precision: 5, scale: 2 }).notNull(),
  total_amount_cents: integer('total_amount_cents').default(0).notNull(),
});

// ==========================================
// 9. REGISTRO DE AUDITORÍA (AUDIT_LOGS)
// ==========================================
export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  user_id: uuid('user_id'),
  event_code: varchar('event_code', { length: 64 }).notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  ip_address: varchar('ip_address', { length: 64 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ==========================================
// 10. CATALOGO DE PRODUCTOS / SERVICIOS
// ==========================================
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price_cents: integer('price_cents').notNull().default(0),
  default_vat: integer('default_vat').notNull().default(21),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 11. CONFIGURACIÓN VISUAL EMPRESA
// ==========================================
export const company_settings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  theme_color: varchar("theme_color", { length: 7 }).default("#4f46e5"),
  font_family: varchar("font_family", { length: 50 }).default("Roboto"),
  logo_url: text("logo_url"),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Types inferidos
export type CompanySettings = typeof company_settings.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Estimate = typeof estimates.$inferSelect;
export type NewEstimate = typeof estimates.$inferInsert;