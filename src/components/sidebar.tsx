import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

export default function Sidebar() {
  return (
    <aside style={{
      width: '260px',
      height: '100vh', // Clave: ocupa todo el alto de la ventana
      backgroundColor: '#1e293b', // Tu color azul muy oscuro
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column', // Permite distribuir el espacio arriba/abajo
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
    }}>
      
      {/* 1. Cabecera y Logo */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ backgroundColor: '#0ea5e9', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
          <i className="fas fa-building"></i>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Mi Empresa S.L.</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Panel Veri*factu</p>
        </div>
      </div>

      {/* 2. Menú de Navegación (flexGrow: 1 empuja el pie hacia abajo) */}
      <nav style={{ flexGrow: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        
        {/* Aquí puedes usar lógica para cambiar la clase "activa" si quieres */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
          <i className="fas fa-chart-pie" style={{ width: '20px', textAlign: 'center' }}></i> Dashboard
        </Link>
        
        <Link href="/nueva-factura" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500 }}>
          <i className="fas fa-plus-circle" style={{ width: '20px', textAlign: 'center' }}></i> Nueva Factura
        </Link>

        <Link href="/historial" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500 }}>
          <i className="fas fa-list" style={{ width: '20px', textAlign: 'center' }}></i> Historial Facturas
        </Link>

        <Link href="/catalogo" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500 }}>
          <i className="fas fa-box" style={{ width: '20px', textAlign: 'center' }}></i> Catálogo Productos
        </Link>

        <Link href="/clientes" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500 }}>
          <i className="fas fa-users" style={{ width: '20px', textAlign: 'center' }}></i> Directorio Clientes
        </Link>

        <Link href="/empresa" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500 }}>
          <i className="fas fa-cog" style={{ width: '20px', textAlign: 'center' }}></i> Mi Empresa & Logo
        </Link>

      </nav>

      {/* 3. Pie del Sidebar (Usuario, Empresa y Cerrar Sesión) */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid #334155', flexShrink: 0 }}>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          usuario@facturify.com
        </p>
        
        <button style={{ width: '100%', padding: '10px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
          <i className="fas fa-building"></i> Cambiar Empresa
        </button>

        {/* Formulario que conecta con el Server Action */}
        <form action={signOut} style={{ width: '100%', margin: 0 }}>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s' }}>
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </form>
      </div>

    </aside>
  );
}