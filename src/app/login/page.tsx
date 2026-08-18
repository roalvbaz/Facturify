import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import SubmitButton from '@/components/submitButton';

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect('/login?error=true');
    }

    redirect('/dashboard');
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem' }}>
      
      {/* LA TARJETA ENGLOBA TODO */}
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        
        {/* LOGO CENTRADO */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Image 
            src="/img/banner.png"       
            alt="Facturify Logo" 
            width={280}           
            height={65}           
            priority              
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
          
          <SubmitButton/>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <p style={{ color: '#64748b', margin: 0 }}>¿Aún no tienes cuenta? <a href="mailto:hola@tudominio.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>Contacta con nosotros</a></p>
        </div>
      </div>
    </div>
  );
}