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
    user_id: varchar('user_id', { length: 256 }).notNull(),
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
    formatted_number: varchar('formatted_number', { length: 64 }).notNull(), // Ej: "F-2026-0001"
    issued_at: timestamp('issued_at').defaultNow().notNull(),
    due_date:timestamp(''),
    status: varchar('status', { length: 32 }).default('Pendiente').notNull(),

    // Campos de encadenamiento e integridad Veri*factu
    prev_hash: text('prev_hash'),
    current_hash: text('current_hash'),
    canonical_string: text('canonical_string'),
    qr_code_url: text('qr_code_url'),

    // Importes normalizados en céntimos
    subtotal_cents: integer('subtotal_cents').default(0).notNull(),
    vat_total_cents: integer('vat_total_cents').default(0).notNull(),
    total_cents: integer('total_cents').default(0).notNull(),
    currency: varchar('currency', { length: 8 }).default('EUR').notNull(),

    created_at: timestamp('created_at').defaultNow().notNull(),
    is_locked: boolean('is_locked').default(true).notNull(), // Bloqueo fiscal de factura
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
// 7. REGISTRO DE AUDITORÍA (AUDIT_LOGS)
// ==========================================
export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  user_id: varchar('user_id', { length: 256 }),
  event_code: varchar('event_code', { length: 64 }).notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  ip_address: varchar('ip_address', { length: 64 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
// ==========================================
// 8. CATALOGO DE PRODUCTOS / SERVICIOS 
// ==========================================
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price_cents: integer('price_cents').notNull().default(0), // Guardamos en céntimos
  default_vat: integer('default_vat').notNull().default(21), // IVA defect para el product
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});