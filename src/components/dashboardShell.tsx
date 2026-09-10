'use client';

import { useState } from 'react';
import Sidebar from '@/components/sidebar';

export default function DashboardShell({
  children,
  companies,
  activeCompanyId,
  nombreEmpresa,
  emailUsuario,
  isAdmin,
}: {
  children: React.ReactNode;
  companies: Array<{ id: string; name: string; tax_id: string; role: string }>;
  activeCompanyId: string;
  nombreEmpresa: string;
  emailUsuario: string;
  isAdmin?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const close = () => setSidebarOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* Barra superior (solo visible en móvil) */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú de navegación"
        >
          <i className="fas fa-bars"></i>
        </button>
        <span className="mobile-topbar-title">FacturON</span>
      </header>

      {/* Fondo oscuro al abrir el menú en móvil */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={close} />}

      <Sidebar
        companies={companies}
        activeCompanyId={activeCompanyId}
        nombreEmpresa={nombreEmpresa}
        emailUsuario={emailUsuario}
        isAdmin={isAdmin}
        isOpen={sidebarOpen}
        onClose={close}
      />
      <main className="main-content" style={{ flexGrow: 1, height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}