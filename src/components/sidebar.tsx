'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';

export default function Sidebar({ 
  nombreEmpresa, 
  emailUsuario 
}: { 
  nombreEmpresa: string;
  emailUsuario: string;
}) {
  const pathname = usePathname();

  // Función auxiliar para saber si el link está activo
  const isActive = (path: string) => pathname?.startsWith(path);

  // Estilo base para los enlaces
  const linkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: active ? 600 : 500,
    backgroundColor: active ? '#0ea5e9' : 'transparent',
    color: active ? 'white' : '#cbd5e1',
    transition: 'all 0.2s ease-in-out',
  });

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: '#1e293b',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
    }}>
      
      {/* 1. Cabecera */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ backgroundColor: '#0ea5e9', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          <i className="fas fa-building"></i>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nombreEmpresa}
          </h2>
        </div>
      </div>

      {/* 2. Menú de Navegación Dinámico */}
      <nav style={{ flexGrow: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        <Link href="/dashboard" style={linkStyle(isActive('/dashboard'))}>
          <i className="fas fa-chart-pie" style={{ width: '20px', textAlign: 'center' }}></i> Dashboard
        </Link>
        <Link href="/nueva-factura" style={linkStyle(isActive('/nueva-factura'))}>
          <i className="fas fa-plus-circle" style={{ width: '20px', textAlign: 'center' }}></i> Nueva Factura
        </Link>
        <Link href="/historial" style={linkStyle(isActive('/historial'))}>
          <i className="fas fa-list" style={{ width: '20px', textAlign: 'center' }}></i> Historial
        </Link>
        <Link href="/productos" style={linkStyle(isActive('/productos'))}>
          <i className="fas fa-box" style={{ width: '20px', textAlign: 'center' }}></i> Productos
        </Link>
        <Link href="/clientes" style={linkStyle(isActive('/clientes'))}>
          <i className="fas fa-users" style={{ width: '20px', textAlign: 'center' }}></i> Clientes
        </Link>
        <Link href="/configuracion" style={linkStyle(isActive('/configuracion'))}>
          <i className="fas fa-cog" style={{ width: '20px', textAlign: 'center' }}></i> Configuración
        </Link>
      </nav>

      {/* 3. Pie del Sidebar */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid #334155', flexShrink: 0 }}>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emailUsuario}>
          {emailUsuario}
        </p>
        <form action={signOut} style={{ width: '100%', margin: 0 }}>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s' }}>
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </form>
      </div>

    </aside>
  );
}