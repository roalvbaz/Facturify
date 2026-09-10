"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  updateCompanySettingsAction,
  updateTemplateAction,
  saveCompanyCertificateAction,
  removeCompanyCertificateAction,
  getCompanyCertificateInfoAction,
  updateAeatEnvironmentAction,
} from "@/actions/company.actions";
import { showToast } from "@/lib/utils/toast";
import TemplateSelector from "@/components/templateSelector";
import TemplatePreview from "@/components/templatePreview";
import { getTemplateById, INVOICE_TEMPLATES } from "@/lib/invoice-templates";

export default function ConfigForm({ company }: { company: any }) {
  const [loading, setLoading] = useState(false);
  const [selectedColor] = useState(company.theme_color || "#4f46e5");
  const [templateId, setTemplateId] = useState(company.template_id || "clasico-tradicional");
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // ── Estado del certificado AEAT ──
  const [certInfo, setCertInfo] = useState<any>(null);
  const [certLoading, setCertLoading] = useState(true);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState("");
  const [aeatEnv, setAeatEnv] = useState<"sandbox" | "production">(
    (company.aeat_environment as "sandbox" | "production") || "sandbox"
  );
  const [savingEnv, setSavingEnv] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getCompanyCertificateInfoAction()
      .then((res) => {
        if (res.success) setCertInfo(res.certificate);
      })
      .catch(() => {})
      .finally(() => setCertLoading(false));
  }, []);

  const currentTemplate = getTemplateById(templateId);

  const handleSelectTemplate = async (template: any) => {
    setSavingTemplate(true);
    try {
      const res = await updateTemplateAction(template.id);
      if (res.success) {
        setTemplateId(template.id);
        showToast.success(`Plantilla "${template.name}" aplicada`);
        router.refresh();
      } else {
        showToast.error(res.error || "Error al guardar la plantilla");
      }
    } catch (err: any) {
      showToast.error(err?.message || "Error inesperado");
    } finally {
      setSavingTemplate(false);
    }
  };

  const THEME_OPTIONS = [
    { value: 'light', label: 'Claro', icon: 'fa-sun', desc: 'Tema claro siempre' },
    { value: 'dark', label: 'Oscuro', icon: 'fa-moon', desc: 'Tema oscuro siempre' },
    { value: 'system', label: 'Sistema', icon: 'fa-desktop', desc: 'Según tu dispositivo' },
  ];

  // ── Handlers del certificado AEAT ──

  const handleUploadCertificate = async () => {
    if (!pfxFile) {
      showToast.error("Selecciona un archivo .pfx o .p12");
      return;
    }
    if (!pfxPassword.trim()) {
      showToast.error("Introduce la contraseña del certificado");
      return;
    }
    setUploadingCert(true);
    try {
      const fd = new FormData();
      fd.append("pfx_file", pfxFile);
      fd.append("pfx_password", pfxPassword);
      fd.append("aeat_environment", aeatEnv);
      const res = await saveCompanyCertificateAction(fd);
      if (res.success) {
        showToast.success("Certificado guardado correctamente");
        setPfxFile(null);
        setPfxPassword("");
        // Recargar info del certificado
        const info = await getCompanyCertificateInfoAction();
        if (info.success) setCertInfo(info.certificate);
        router.refresh();
      } else {
        showToast.error(res.error || "Error al guardar el certificado");
      }
    } catch (err: any) {
      showToast.error(err?.message || "Error inesperado al subir el certificado");
    } finally {
      setUploadingCert(false);
    }
  };

  const handleRemoveCertificate = async () => {
    if (!confirm("¿Eliminar el certificado digital de la empresa?")) return;
    try {
      const res = await removeCompanyCertificateAction();
      if (res.success) {
        showToast.success("Certificado eliminado");
        setCertInfo(null);
        router.refresh();
      } else {
        showToast.error(res.error || "Error al eliminar");
      }
    } catch (err: any) {
      showToast.error(err?.message || "Error inesperado");
    }
  };

  // Valida el archivo del certificado (extensión + tamaño) antes de subirlo
  const acceptPfxFile = (file: File) => {
    if (!/\.(pfx|p12)$/i.test(file.name)) {
      showToast.error("Solo se admiten archivos .pfx o .p12");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast.error("El certificado no puede superar 3 MB");
      return;
    }
    setPfxFile(file);
  };

  // Cambia el entorno AEAT. Con certificado ya guardado lo persiste al
  // instante; sin certificado, el entorno se guarda junto a la subida.
  const handleEnvironmentChange = async (env: "sandbox" | "production") => {
    if (env === aeatEnv || savingEnv) return;
    const prev = aeatEnv;
    setAeatEnv(env);
    if (!certInfo) return;
    setSavingEnv(true);
    try {
      const res = await updateAeatEnvironmentAction(env);
      if (res.success) {
        showToast.success(`Entorno AEAT: ${env === "production" ? "producción" : "pruebas (sandbox)"}`);
        router.refresh();
      } else {
        setAeatEnv(prev);
        showToast.error(res.error || "Error al cambiar el entorno");
      }
    } catch (err: any) {
      setAeatEnv(prev);
      showToast.error(err?.message || "Error inesperado");
    } finally {
      setSavingEnv(false);
    }
  };

  // Formulario de subida del certificado (reutilizado en el alta y en la sustitución)
  const uploadForm = (
    <div style={{
      padding: "14px",
      borderRadius: "10px",
      border: dragOver ? "2px dashed var(--primary)" : "1px dashed var(--border-color)",
      backgroundColor: dragOver ? "rgba(99,102,241,0.06)" : "var(--bg-color)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      transition: "border-color 0.15s ease, background-color 0.15s ease",
    }}>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        Sube tu certificado digital en formato <strong>.pfx</strong> o <strong>.p12</strong> (PKCS#12) para enviar facturas a la AEAT vía Veri*factu.
        Se cifra con <strong>AES-256-GCM</strong> y cada empresa usa el suyo.
      </p>

      {/* Zona de drag & drop / selector de archivo */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) acceptPfxFile(file);
        }}
        onClick={() => document.getElementById("pfx-file-input")?.click()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "18px 12px",
          borderRadius: "10px",
          cursor: "pointer",
          border: "1px dashed var(--border-color)",
          backgroundColor: "var(--card-bg)",
        }}
      >
        <i className={`fas ${pfxFile ? "fa-certificate" : "fa-cloud-upload-alt"}`} style={{ fontSize: "1.5rem", color: dragOver ? "var(--primary)" : "var(--primary)", opacity: 0.85 }}></i>
        {pfxFile ? (
          <>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>{pfxFile.name}</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {(pfxFile.size / 1024).toFixed(1)} KB &middot; haz clic para cambiarlo
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
              Arrastra el certificado aquí o haz clic para elegirlo
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Solo .pfx / .p12 &middot; máximo 3 MB
            </span>
          </>
        )}
        <input
          id="pfx-file-input"
          type="file"
          accept=".pfx,.p12"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) acceptPfxFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Contraseña */}
      <div>
        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
          Contraseña del PFX
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={pfxPassword}
            onChange={(e) => setPfxPassword(e.target.value)}
            placeholder="Contraseña del certificado"
            className="form-control"
            style={{ height: "38px", fontSize: "0.8rem", width: "100%", paddingRight: "38px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              padding: "6px",
            }}
          >
            <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleUploadCertificate}
        disabled={uploadingCert || !pfxFile || !pfxPassword}
        className="btn btn-primary"
        style={{
          alignSelf: "flex-start",
          fontSize: "0.78rem",
          fontWeight: 600,
          padding: "0.4rem 1rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          opacity: uploadingCert || !pfxFile || !pfxPassword ? 0.6 : 1,
          cursor: uploadingCert || !pfxFile || !pfxPassword ? "not-allowed" : "pointer",
        }}
      >
        {uploadingCert
          ? <><i className="fas fa-spinner fa-spin"></i> Validando y guardando…</>
          : <><i className="fas fa-upload"></i> Guardar certificado</>
        }
      </button>
    </div>
  );

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
      <div className="responsive-grid">
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

      <div className="responsive-grid">
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

      {/* Selector de Plantilla de Factura */}
      <div>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-color)", margin: "0.5rem 0 0.75rem 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-file-invoice" style={{ color: "var(--text-muted)" }}></i> Plantilla de Factura
        </h4>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-color)",
            cursor: savingTemplate ? "wait" : "pointer",
            opacity: savingTemplate ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
          onClick={() => !savingTemplate && setIsTemplateSelectorOpen(true)}
        >
          {/* Mini preview de la plantilla actual */}
          <div style={{ flexShrink: 0, transform: "scale(0.75)", transformOrigin: "top left" }}>
            {currentTemplate ? (
              <TemplatePreview template={currentTemplate} />
            ) : (
              <div style={{ width: 150, height: 105, borderRadius: 4, border: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Sin plantilla
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-color)", marginBottom: "2px" }}>
              {currentTemplate?.name || "Clásico Tradicional"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
              {currentTemplate?.category || "clásico"} &middot; {INVOICE_TEMPLATES.length} plantillas disponibles
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600, marginTop: "6px" }}>
              <i className="fas fa-palette" style={{ marginRight: "4px" }}></i>
              {savingTemplate ? "Guardando..." : "Clic para cambiar plantilla"}
            </div>
          </div>

          <div style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: "1.2rem" }}>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CERTIFICADO DIGITAL AEAT (Veri*factu)
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", margin: "0.5rem 0 0.75rem 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-certificate" style={{ color: "var(--text-muted)" }}></i> Certificado Digital AEAT (Veri*factu)
        </h4>

        {/* ── Entorno AEAT (siempre visible, persiste al instante con cert) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <button
            type="button"
            onClick={() => handleEnvironmentChange("sandbox")}
            disabled={savingEnv}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", textAlign: "left",
              padding: "10px 12px", borderRadius: "10px", cursor: savingEnv ? "wait" : "pointer",
              border: aeatEnv === "sandbox" ? "2px solid #f59e0b" : "1px solid var(--border-color)",
              backgroundColor: aeatEnv === "sandbox" ? "rgba(245,158,11,0.08)" : "var(--bg-color)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="fas fa-flask" style={{ color: "#f59e0b" }}></i> Sandbox (pruebas)
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
              Entorno de pruebas AEAT. No genera envíos reales.
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleEnvironmentChange("production")}
            disabled={savingEnv}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", textAlign: "left",
              padding: "10px 12px", borderRadius: "10px", cursor: savingEnv ? "wait" : "pointer",
              border: aeatEnv === "production" ? "2px solid #ef4444" : "1px solid var(--border-color)",
              backgroundColor: aeatEnv === "production" ? "rgba(239,68,68,0.08)" : "var(--bg-color)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="fas fa-server" style={{ color: "#ef4444" }}></i> Producción
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
              Envíos reales a la AEAT. Requiere certificado real.
            </span>
          </button>
        </div>

        {certLoading ? (
          <div style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: "6px" }}></i> Cargando información del certificado…
          </div>
        ) : certInfo ? (
          /* ── Certificado existente ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{
            padding: "14px",
            borderRadius: "10px",
            border: certInfo.isExpired ? "1px solid #ef4444" : "1px solid #22c55e",
            backgroundColor: certInfo.isExpired ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <i className={`fas ${certInfo.isExpired ? "fa-exclamation-triangle" : "fa-check-circle"}`}
                style={{ fontSize: "1.1rem", color: certInfo.isExpired ? "#ef4444" : "#22c55e" }}></i>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                {certInfo.isExpired ? "Certificado caducado" : "Certificado activo"}
              </span>
              <span style={{
                marginLeft: "auto",
                fontSize: "0.7rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: aeatEnv === "production" ? "#dc2626" : "#f59e0b",
                color: "#fff",
              }}>
                {aeatEnv === "production" ? "PRODUCCIÓN" : "SANDBOX"}
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              <div><strong>Subject:</strong> {certInfo.subject}</div>
              <div><strong>Válido desde:</strong> {certInfo.validFrom} <strong>hasta:</strong> {certInfo.validTo}</div>
            </div>
            <div style={{ display: "flex", gap: "18px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowUploadForm((v) => !v)}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--primary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <i className="fas fa-exchange-alt" style={{ marginRight: "4px" }}></i>
                  {showUploadForm ? "Cancelar sustitución" : "Subir nuevo certificado"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCertificate}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <i className="fas fa-trash" style={{ marginRight: "4px" }}></i> Eliminar certificado
                </button>
              </div>
            </div>

            {showUploadForm && uploadForm}
          </div>
        ) : (
          /* ── Formulario de subida ── */
          uploadForm
        )}
      </div>

      {/* Selector de Tema */}
      <div>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", margin: "0.5rem 0 0.75rem 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-palette" style={{ color: "var(--text-muted)" }}></i> Apariencia de la App
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                padding: "14px 10px",
                borderRadius: "10px",
                border: theme === opt.value ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                backgroundColor: theme === opt.value ? "rgba(99, 102, 241, 0.08)" : "var(--card-bg)",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
              }}
            >
              <i className={`fas ${opt.icon}`} style={{ fontSize: "1.3rem", color: theme === opt.value ? "var(--primary)" : "var(--text-muted)" }}></i>
              <span style={{ fontSize: "0.8rem", fontWeight: theme === opt.value ? 700 : 500, color: "var(--text-main)" }}>
                {opt.label}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
                {opt.desc}
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

      {/* Modal selector de plantillas */}
      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        currentTemplateId={templateId}
        onSelect={handleSelectTemplate}
        onClose={() => setIsTemplateSelectorOpen(false)}
      />
    </form>
  );
}