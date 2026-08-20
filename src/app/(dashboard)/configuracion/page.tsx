import { db } from "@/db";
import { companies, company_members, company_settings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ConfigForm from "./configForm";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [member] = await db.select().from(company_members).where(eq(company_members.user_id, user.id)).limit(1);
  if (!member) redirect("/login");

  const [company] = await db.select().from(companies).where(eq(companies.id, member.company_id)).limit(1);
  const [settings] = await db.select().from(company_settings).where(eq(company_settings.company_id, member.company_id)).limit(1);

  const mergedData = { ...company, ...settings };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-color)", margin: "0 0 2px 0" }}>Configuración de Empresa</h2>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>Administra los datos fiscales y el diseño visual de tus facturas.</p>
      </div>

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-color)", margin: "0 0 1.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-building" style={{ color: "var(--text-muted)" }}></i> Panel de Control Fiscal y Estético
        </h3>
        <ConfigForm company={mergedData} />
      </div>

      <div className="card" style={{ padding: "1.5rem", border: "1px solid #10b981", backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ backgroundColor: "#10b981", color: "white", padding: "10px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-shield-alt" style={{ fontSize: "1.2rem" }}></i>
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#065f46", margin: "0 0 5px 0" }}>Cumplimiento Veri*factu (AEAT)</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#064e3b", lineHeight: 1.5 }}>
              Entorno protegido bajo el Real Decreto 1007/2023 con encadenamiento SHA-256.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}