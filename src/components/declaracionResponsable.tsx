import React from 'react';

export default function DeclaracionResponsable() {
  return (
    <div className="card" style={{ padding: "1.5rem", border: "1px solid #10b981", backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
        <div style={{ backgroundColor: "#10b981", color: "white", padding: "10px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fas fa-shield-alt" style={{ fontSize: "1.2rem" }}></i>
        </div>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#065f46" }}>
          Declaración Responsable de Cumplimiento Normativo
        </h2>
      </div>

      <div style={{ fontSize: "0.9rem", color: "#064e3b", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0 }}>
          En cumplimiento de lo dispuesto en el artículo 15 de la Orden HAC/1177/2024, de 17 de octubre, y del Real Decreto 1007/2023, de 5 de diciembre, el fabricante de este software declara bajo su exclusiva responsabilidad que el presente sistema informático cumple íntegramente con los requisitos legales de integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros de facturación.
        </p>

        <div style={{ backgroundColor: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #a7f3d0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "0.5rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
            <li><strong style={{ color: "#0f172a" }}>Sistema Informático:</strong> FacturON</li>
            <li><strong style={{ color: "#0f172a" }}>Versión Garantizada:</strong> 1.0.0</li>
            <li><strong style={{ color: "#0f172a" }}>Fabricante / Razón Social:</strong> Rodrigo Alvarez Baz</li>
            <li><strong style={{ color: "#0f172a" }}>NIF del Fabricante:</strong> [TU NIF/CIF]</li>
            <li><strong style={{ color: "#0f172a" }}>Modalidad de Operación:</strong> Sistema de emisión VERI*FACTU</li>
            <li><strong style={{ color: "#0f172a" }}>Arquitectura:</strong> Sistema Multi-inquilino (Multi-tenancy) admitido</li>
          </ul>
        </div>

        <p style={{ margin: 0, fontSize: "0.8rem", fontStyle: "italic", opacity: 0.8 }}>
          El diseño de esta plataforma impide la existencia de software de doble uso o contabilidad paralela, garantizando la remisión y encadenamiento criptográfico (SHA-256) de todos los registros expedidos.
        </p>
      </div>
    </div>
  );
}