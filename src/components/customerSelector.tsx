'use client';

import React, { useState } from "react";
import { Search, Users, X } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  tax_id: string;
  email: string | null;
  address: string | null;
}

interface CustomerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerSelector({ isOpen, onClose, customers, onSelectCustomer }: CustomerSelectorProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.tax_id && c.tax_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}>
        
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>Buscar Cliente</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona un cliente de tu directorio</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Buscador */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: '16px', height: '16px' }} />
            <input
              type="text"
              placeholder="Buscar por Nombre o NIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ width: '100%', paddingLeft: '35px', height: '38px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Users style={{ width: '32px', height: '32px', margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)' }}>No tienes clientes guardados</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No se encontraron coincidencias.</p>
            </div>
          ) : (
            filteredCustomers.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectCustomer(item);
                  onClose();
                }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>{item.name}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.email || "Sin email"}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-color)', fontWeight: 600, backgroundColor: 'var(--bg-color)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    NIF: {item.tax_id || "N/D"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pie */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
          <button type="button" className="btn" onClick={onClose} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}