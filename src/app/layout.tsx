import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Facturify - Panel Veri*factu',
  description: 'Sistema de facturación inmutable',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />
      </head>
      <body>
        <div className="app-layout">
          
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-logo">
                <i className="fas fa-building"></i>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h3 style={{ fontSize: '1rem', color: 'white', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Mi Empresa S.L.
                </h3>
                <span style={{ fontSize: '10px', color: 'var(--sidebar-text)' }}>Panel Veri*factu</span>
              </div>
            </div>

            {/* Añadido overflowX: 'hidden' para eliminar el deslizador horizontal */}
            <nav className="sidebar-nav" style={{ overflowX: 'hidden' }}>
              <Link href="/dashboard" className="nav-btn active">
                <i className="fas fa-chart-pie" style={{ width: '20px' }}></i> Dashboard
              </Link>
              <Link href="/test-factura" className="nav-btn">
                <i className="fas fa-plus-circle" style={{ width: '20px' }}></i> Nueva Factura
              </Link>
              <Link href="/historial" className="nav-btn">
                <i className="fas fa-list-alt" style={{ width: '20px' }}></i> Historial Facturas
              </Link>
              <Link href="/productos" className="nav-btn">
                <i className="fas fa-box" style={{ width: '20px' }}></i> Catálogo Productos
              </Link>
              <Link href="/clientes" className="nav-btn">
                <i className="fas fa-users" style={{ width: '20px' }}></i> Directorio Clientes
              </Link>
              <Link href="/configuracion" className="nav-btn">
                <i className="fas fa-cog" style={{ width: '20px' }}></i> Mi Empresa & Logo
              </Link>
            </nav>

            <div className="sidebar-footer">
              <p style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-muted)' }}>
                usuario@facturify.com
              </p>
              <button className="btn" style={{ background: '#334155', color: 'white', marginBottom: '10px', width: '100%' }}>
                <i className="fas fa-building"></i> Cambiar Empresa
              </button>
              <button className="btn" style={{ background: '#1e293b', color: '#cbd5e1', width: '100%' }}>
                <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
              </button>
            </div>
          </aside>

          <main className="main-content">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}