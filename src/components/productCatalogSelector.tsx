"use client";

import React, { useState, useEffect } from "react";
import { getCompanyProductsAction } from "@/actions/product.actions";
import { Product } from "@/db/schema";
import { toast } from "sonner";

interface ProductCatalogSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: { description: string; unitPrice: number; vatPercent: number }) => void;
}

export function ProductCatalogSelector({ isOpen, onClose, onSelectProduct }: ProductCatalogSelectorProps) {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getCompanyProductsAction(search)
        .then((res) => {
          if (res.success && res.data) {
            setProductsList(res.data);
          } else {
            toast.error(res.error || "Error al cargar productos");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.6)', // Fondo oscuro
      backdropFilter: 'blur(4px)',
      zIndex: 9999, // Asegura que esté por encima de todo
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '600px',
        backgroundColor: 'var(--bg-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        overflow: 'hidden'
      }}>
        
        {/* CABECERA MODAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>Insertar desde Catálogo</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona un concepto para añadirlo a la factura</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* BUSCADOR */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              placeholder="Buscar por concepto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ width: '100%', paddingLeft: '35px', height: '38px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '10px' }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Cargando catálogo...</p>
            </div>
          ) : productsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }}></i>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)' }}>No hay conceptos guardados</p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Crea productos desde la pantalla de catálogo</p>
            </div>
          ) : (
            productsList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectProduct({
                    description: item.name + (item.description ? ` - ${item.description}` : ""),
                    unitPrice: item.price_cents / 100,
                    vatPercent: item.default_vat,
                  });
                  onClose();
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>{item.name}</h4>
                  {item.description && <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.description}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>
                    {(item.price_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>IVA {item.default_vat}%</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PIE */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
          <button type="button" className="btn" onClick={onClose} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}