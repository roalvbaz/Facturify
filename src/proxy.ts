import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

// En Next.js 16, el antiguo middleware.ts se llama proxy.ts y vive al mismo
// nivel que app/ (no dentro). Se exporta como función `proxy` y corre en Node.
export async function proxy(request: NextRequest) {
  // 1. Inicializamos la respuesta base y añadimos protección CSRF
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const csrfNonce = crypto.randomUUID();
  response.headers.set('X-CSRF-Token', csrfNonce);

  // 2. Creamos el cliente de Supabase adaptado al proxy
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

  const pathname = request.nextUrl.pathname;

  // Rutas accesibles SIN sesión:
  // - /login (página de acceso)
  // - /recuperar-password (página de recuperación)
  // - /registro (página pública de registro: solo valida las invitaciones ?invite=...)
  // - /api/auth/* (login y canje del código del correo: todavía no hay cookie)
  // - /api/cron/* (disparado por un cron externo, sin cookies de usuario)
  // - /api/admin/* (lo llama el backend de la web de marketing; se protege
  //   con su propio secreto en el header `x-admin-secret`, no con la sesión)
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/recuperar-password') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/admin/');

  // 4. Lógica de protección de rutas
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && (pathname.startsWith('/login') || pathname.startsWith('/recuperar-password'))) {
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