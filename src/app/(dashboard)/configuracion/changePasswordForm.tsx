"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { showToast } from "@/lib/utils/toast";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent("");
    setNewPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 8) {
      showToast.error("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }
    if (newPassword !== confirm) {
      showToast.error("Las contraseñas nuevas no coinciden");
      setLoading(false);
      return;
    }

    const res = await changePasswordAction(current, newPassword);

    if (res.success) {
      showToast.success("Contraseña actualizada correctamente");
      reset();
    } else {
      showToast.error(res.error || "No se pudo cambiar la contraseña");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = { width: "100%", paddingRight: show ? "44px" : undefined };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          Contraseña Actual *
        </label>
        <div style={{ position: "relative" }}>
          <input type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} className="form-control" autoComplete="current-password" required style={inputStyle} />
        </div>
      </div>

      <div className="responsive-grid">
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Nueva Contraseña *
          </label>
          <div style={{ position: "relative" }}>
            <input type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-control" autoComplete="new-password" minLength={8} required style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Repite la Nueva *
          </label>
          <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="form-control" autoComplete="new-password" minLength={8} required style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <i className={`fas ${show ? "fa-eye-slash" : "fa-eye"}`}></i>
          {show ? "Ocultar" : "Mostrar"} contraseñas
        </button>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ fontWeight: 600, fontSize: "0.85rem", padding: "0.5rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-key"></i>}
          <span>Cambiar Contraseña</span>
        </button>
      </div>
    </form>
  );
}
