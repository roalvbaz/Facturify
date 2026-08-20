"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompanySettingsAction } from "@/actions/company.actions";
import { showToast } from "@/lib/utils/toast";

const PRESET_COLORS = [
  { label: "Índigo", hex: "#4f46e5" },
  { label: "Azul Océano", hex: "#0284c7" },
  { label: "Esmeralda", hex: "#059669" },
  { label: "Pizarra Oscuro", hex: "#0f172a" },
  { label: "Rubí / Burdeos", hex: "#9f1239" },
  { label: "Violeta", hex: "#7c3aed" },
];

export default function ConfigForm({ company }: { company: any }) {
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(company.theme_color || "#4f46e5");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("theme_color", selectedColor);

    try {
      const res = await updateCompanySettingsAction(formData);
      if (res.success) {
        showToast.success("Configuración actualizada correctamente");
        router.refresh();
      } else {
        showToast.error(res.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      showToast.error(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Datos Fiscales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Razón Social / Nombre *
          </label>
          <input type="text" name="name" defaultValue={company.name || ""} className="form-control" style={{ height: "38px", fontSize: "0.9rem", width: "100%" }} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            NIF / CIF *
          </label>
          <input type="text" name="tax_id" defaultValue={company.tax_id || ""} className="form-control" style={{ height: "38px", fontSize: "0.9rem", width: "100%" }} required />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          Dirección Fiscal
        </label>
        <input type="text" name="address" defaultValue={company.address || ""} className="form-control" style={{ height: "38px", fontSize: "0.9rem", width: "100%" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Ciudad
          </label>
          <input type="text" name="city" defaultValue={company.city || ""} className="form-control" style={{ height: "38px", fontSize: "0.9rem", width: "100%" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Código Postal
          </label>
          <input type="text" name="postal_code" defaultValue={company.postal_code || ""} className="form-control" style={{ height: "38px", fontSize: "0.9rem", width: "100%" }} />
        </div>
      </div>

      {/* Subida de Logotipo */}
      <div>
        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          Logotipo de la Empresa
        </label>
        <input type="hidden" name="current_logo_url" value={company.logo_url || ""} />
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {company.logo_url && (
            <img 
              src={company.logo_url} 
              alt="Logo actual" 
              style={{ width: "38px", height: "38px", objectFit: "contain", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "#fff", padding: "2px" }} 
            />
          )}
          <input 
            type="file" 
            name="logo_file" 
            id="logo_file_input"
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const fileNameSpan = document.getElementById('file-name-display');
              if (fileNameSpan && e.target.files && e.target.files[0]) {
                fileNameSpan.textContent = e.target.files[0].name;
              }
            }}
          />
          <label 
            htmlFor="logo_file_input" 
            className="btn" 
            style={{ 
              flex: 1, height: "38px", display: "flex", alignItems: "center", justifyContent: "center", 
              gap: "8px", backgroundColor: "var(--bg-color)", border: "1px solid var(--border-color)", 
              borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-color)", fontWeight: 500 
            }}
          >
            <i className="fas fa-cloud-upload-alt" style={{ color: "var(--primary)" }}></i>
            <span id="file-name-display">Cambiar logotipo...</span>
          </label>
        </div>
      </div>

      {/* Selector de Paleta Cerrada */}
      <div>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-color)", margin: "0.5rem 0 0.75rem 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
          Color de Acento de la Factura
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setSelectedColor(c.hex)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: selectedColor === c.hex ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                backgroundColor: selectedColor === c.hex ? "rgba(14, 165, 233, 0.08)" : "var(--bg-color)",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
              }}
            >
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: c.hex,
                  flexShrink: 0,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
              <span style={{ fontSize: "0.75rem", fontWeight: selectedColor === c.hex ? 700 : 500, color: "var(--text-color)" }}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Botón Guardar */}
      <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
        <button 
          type="submit" 
          disabled={loading} 
          className="btn btn-primary" 
          style={{ fontWeight: 600, fontSize: "0.85rem", padding: "0.5rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          <span>Guardar Cambios</span>
        </button>
      </div>
    </form>
  );
}