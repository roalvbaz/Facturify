# ⚡ FacturON

**Facturación electrónica B2B para autónomos y pymes, lista para Veri\*factu.**

FacturON es tu aplicación de facturación hecha para el mercado español: crea facturas en segundos, con numeración automática, encadenado de hash, código QR y envío directo a la **AEAT** — todo con tu propio certificado digital y sin salir de la misma pantalla.

---

## ✨ Qué hace por ti

### 🧾 Facturas que cumplen
- Editor de facturas con **numeración automática por serie y año** (`F-2026-0001`, …) e importes calculados al céntimo.
- **Encadenado SHA-256** entre facturas + **código QR reglamentario** en cada PDF.
- **Facturas rectificativas / abonos** vinculadas (serie `R`), con motivo AEAT (R1, R2, R3, R4) según RD 1619/2012.
- PDF descargable y **envío por email con el PDF adjunto** al cliente.
- Vista previa de la factura y **sustitución de plantilla** al instante.

### 🇪🇸 Veri\*factu (AEAT) integrado
- **Cada empresa sube su propio certificado PFX/P12** desde Configuración — firma con el suyo, no con un certificado de la plataforma.
- Certificado cifrado en repositorio (**AES-256-GCM**) y validado (parseo + vigencia) antes de guardarse.
- Envío SOAP del `SuministroLRFacturasEmitidas` con estado en vivo: `PENDIENTE → CONFORME / NO_CONFORME / ERROR`, con **reintentos con backoff exponencial**.
- Entorno **sandbox (pruebas) y producción** seleccionable por empresa, sin perder el certificado.
- **Código Seguro de Verificación (CSV)**: comprueba que la AEAT aceptó tu factura.

### 📊 Gestión del negocio
- **Dashboard** con métricas e **evolución de ingresos** (gráficas).
- **Clientes y productos/servicios** en catálogo, reutilizables en cada factura.
- **Gastos y compras** con desglose de **IVA soportado (deducible)** e **IRPF**, para tu modelo 303.
- **Historial** completo con filtros, exportación **CSV** y recordatorios de pago.
- **Multiempresa**: factura con varias sociedades desde una sola cuenta.

### 🛡 Diseñada para el día a día
- **Modo claro/oscuro** y tema de color personalizable por empresa.
- **Roles de equipo** (OWNER / ADMIN / MEMBER) e **invitaciones por email** para incorporar usuarios.
- **Auditoría completa** e inmutable (inicio de sesión, cambios, envíos…) y protección anti-bots (reCAPTCHA) y contra fuerza bruta (rate limiting).
- Diseño **responsive**: funciona en escritorio, tablet y móvil.

---

## 🖼 La aplicación

| Dashboard | Nueva factura | Historial + Veri\*factu |
|:---:|:---:|:---:|
| Métricas e ingresos | Editor con plantilla y QR | Badge de estado AEAT + CSV |
| *(añade tu captura)* | *(añade tu captura)* | *(añade tu captura)* |

| Configuración AEAT | Gastos | Invitaciones |
|:---:|:---:|:---:|
| Sube tu PFX + entorno | IVA soportado e IRPF | Alta de usuarios por email |
| *(añade tu captura)* | *(añade tu captura)* | *(añade tu captura)* |

---

## 🧰 Stack

| Área | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + Turbopack |
| UI | React 19 · CSS variables (modo claro/oscuro) · font-awesome |
| Base de datos | PostgreSQL (Supabase) · **Drizzle ORM** |
| Autenticación | Supabase Auth (SSR) · reCAPTCHA v2 |
| Almacenamiento | Supabase Storage (logos, tickets) |
| Envío AEAT | SOAP + certificados PFX (node-forge) · cifrado AES-256-GCM |
| PDF | Visor y descarga de la factura desde el navegador |
| Email | Nodemailer (Gmail) |
| Estado AEAT | Cola con reintentos (backoff exponencial) + cron |

---

## 🚀 Puesta en marcha

```bash
# 1. Instalar dependencias
npm ci

# 2. Configurar variables de entorno
cp .env.example .env
#    ← Rellena Supabase, reCAPTCHA, Gmail y tus claves AEAT.

# 3. Arrancar en desarrollo
npm run dev        # http://localhost:3000

# 4. Construir y publicar
npm run build
npm run start
```

> Aplicar la base de datos: ejecuta los SQL de `supabase/` y `drizzle/` en el SQL editor de Supabase (hay un `MASTER_SCHEMA.sql` que crea todo el esquema).

---

## 🗂 Estructura rápida

```
src/app            → páginas y API (proxy de protección de sesión en src/proxy.ts)
src/actions        → server actions (empresas, facturas, gastos, clientes, productos…)
src/components     → UI de cliente (sidebar, modales, tablas, PDF de factura…)
src/db/schema.ts   → esquema de base de datos (origen de verdad para Drizzle)
src/lib            → lógica: verifactu (certificado, cifrado, SOAP, cola), pdf, email, auditoría
supabase/          → migraciones SQL aplicadas manualmente
```

---

## 🔐 Roles y acceso

- **OWNER** — crea y administra la empresa; ve Invitaciones y panel de administración.
- **ADMIN** — gestiona equipo e invitaciones.
- **MEMBER** — factura y accede a la operativa de la empresa.
- **Admin de plataforma** (`ADMIN_EMAILS`) — gestiona las invitaciones de alta.

---

## 📜 Cumplimiento

- **Veri\*factu** — RD 1007/2023 (libro registro de facturas del IVA).
- **Facturas rectificativas / abonos** — RD 1619/2012.
- Cada factura se registra de forma **inmutable** con hash encadenado, QR y CSV ante la AEAT.

---

*Hecho con ❤️ para el mercado español. ¿Problemas o ideas? Abre un issue.*