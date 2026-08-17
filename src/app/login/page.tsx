import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedParams = await searchParams;
  const errorMsg = resolvedParams.error;

  async function handleLogin(formData: FormData) {
    'use server';
    
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = await createClient();

    // Intentamos iniciar sesión con Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Si falla, recargamos la página pasando un parámetro de error
      redirect('/login?error=true');
    }

    // Si hay éxito, vamos al dashboard
    redirect('/dashboard');
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>
            <i className="fas fa-file-invoice"></i>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Acceso a Clientes</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Inicia sesión para gestionar tus facturas</p>
        </div>
        
        {/* Aviso de error de credenciales */}
        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
            Correo o contraseña incorrectos.
          </div>
        )}
        
        <form action={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Correo Electrónico</label>
            <input type="email" id="email" name="email" className="form-control" placeholder="tu@empresa.com" required />
          </div>
          
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: 0 }}>Contraseña</label>
            </div>
            <input type="password" id="password" name="password" className="form-control" placeholder="••••••••" required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <i className="fas fa-sign-in-alt"></i> Entrar
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <p style={{ color: '#64748b', margin: 0 }}>¿Aún no tienes cuenta? <a href="mailto:hola@tudominio.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>Contacta con nosotros</a></p>
        </div>

      </div>
    </div>
  );
}