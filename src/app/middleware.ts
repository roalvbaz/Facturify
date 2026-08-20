import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

export async function middleware(request: NextRequest) {
  // 1. Inicializamos la respuesta base y añadimos protección CSRF
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const csrfNonce = crypto.randomUUID();
  response.headers.set('X-CSRF-Token', csrfNonce);

  // 2. Creamos el cliente de Supabase adaptado al Edge
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Verificamos la sesión real con Supabase
  const { data: { session } } = await supabase.auth.getSession();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // 4. Lógica de protección de rutas
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 5. Blindaje extra: Ocultar información del servidor al exterior
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

// Configuramos a qué rutas afecta este vigilante
export const config = {
  matcher: [
    /*
     * Ignoramos las rutas estáticas y de sistema para no consumir recursos:
     * - _next/static, _next/image, favicon.ico
     * - Imágenes (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};