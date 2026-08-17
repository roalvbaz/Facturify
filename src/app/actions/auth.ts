'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createClient();
  
  // Le decimos a Supabase que destruya la sesión actual
  await supabase.auth.signOut();
  
  // Redirigimos a la puerta de entrada
  redirect('/login');
}