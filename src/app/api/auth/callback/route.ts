import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (code) {
    const supabase = await createClient();
    // Canjeamos el código seguro por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Si va bien, redirigimos a la pantalla de crear nueva contraseña
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  // Si el link ha caducado o es inválido, vuelve al login con error
  return NextResponse.redirect(`${siteUrl}/login?error=El+enlace+ha+caducado+o+es+inválido`);
}