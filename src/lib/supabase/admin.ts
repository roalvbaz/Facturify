import { createClient } from '@supabase/supabase-js';

// Cliente con rol de servicio: solo para operaciones de administración
// (crear usuarios, generar enlaces, leer datos de otros usuarios).
// NUNCA usar desde el cliente o desde componentes; solo desde rutas/acciones de servidor.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
