-- Añadir campo template_id a company_settings para persistir la plantilla de factura seleccionada
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS template_id varchar(64) DEFAULT 'clasico-tradicional';
