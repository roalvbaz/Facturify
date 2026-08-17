import Sidebar from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', // <-- OBLIGAMOS a que sea horizontal
      flexWrap: 'nowrap',   // <-- PROHIBIMOS terminantemente que salte abajo
      height: '100vh', 
      width: '100vw',       // <-- Ocupa todo el ancho exacto del navegador
      overflow: 'hidden', 
      backgroundColor: '#f8fafc' 
    }}>
      
      {/* Contenedor de la barra lateral blindado */}
      <div style={{ 
        width: '260px', 
        minWidth: '260px', // <-- Impide que el contenido principal la encoja o la empuje
        height: '100vh', 
        flexShrink: 0,
        backgroundColor: '#1e293b' 
      }}>
        <Sidebar />
      </div>
      
      {/* Contenido Principal */}
      <main style={{ 
        flexGrow: 1, 
        minWidth: 0, // <-- Truco de oro en Flexbox: evita que el contenido interior rompa el layout
        height: '100vh', 
        overflowY: 'auto', 
        padding: '2rem' 
      }}>
        {children}
      </main>
      
    </div>
  );
}