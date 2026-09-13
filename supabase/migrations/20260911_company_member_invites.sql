-- Añadir contexto de empresa a las invitaciones para el flujo de EQUIPO:
-- cuando un OWNER/ADMIN invita a un email a incorporarse a una empresa.
-- company_id NULL = invitación de plataforma (el flujo clásico de /invitaciones).
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invited_role varchar(32) DEFAULT 'MEMBER';