# 📄 FACTURIFY — Plan Director de Proyecto & Especificación Técnica

> **Versión del Documento:** 2.1.0  
> **Estado:** Fase de Diseño & Especificación de Requisitos  
> **Ámbito Normativo:** Ley 11/2021, Real Decreto 1007/2023, Orden HAC/1177/2024 (Reglamento Veri*factu - España) y Guías Técnicas AEAT  
> **Arquitectura Objetivo:** Next.js (App Router) + TypeScript + PostgreSQL (Supabase) + Cloudflare Pages/Workers + Drizzle ORM  
> **Sistema Documental:** Obsidian Technical Vault (Markdown local-first + Git)  

---

## ⚠️ CLÁUSULA DE DESARROLLO AUTÓNOMO (RESTRICCIÓN OBLIGATORIA)

> ### 🛑 REGLA FUNDAMENTAL DE TRABAJO:
> **Queda expresamente restringido el suministro de código de implementación directa.**  
> El desarrollador debe escribir, estructurar, probar y depurar el **100% del código fuente** de manera manual e independiente.  
> 
> La asistencia técnica externa se limitará estrictamente a:
> 1. Especificación de algoritmos, flujos y arquitectura.
> 2. Definición formal de esquemas relacionales y formatos canónicos normativos.
> 3. Revisión de cumplimiento de requisitos legales y tributarios.
> 4. Resolución de dudas teóricas y diseño de casos de prueba.
> 5. Estructuración y estandarización del sistema de documentación técnica.

---

## 1. Resumen Ejecutivo del Proyecto

**Facturify** es un software de facturación B2B en la nube (*Software as a Service*) diseñado para autónomos y pequeñas/medianas empresas en España. Su objetivo prioritario es permitir la emisión de facturas ordinarias y rectificativas con plena validez legal, garantizando la inalterabilidad, trazabilidad y verificación tributaria exigida por el **Reglamento Veri\*factu de la AEAT**.

### Objetivos Principales:
* **Cumplimiento Normativo Total:** Cumplir el Art. 29.2.j de la LGT, el RD 1007/2023 y la Orden HAC/1177/2024, evitando sanciones por software no certificado.
* **Integridad Transaccional:** Eliminar colisiones de numeración y saltos en las series correlativas anuales.
* **Multi-tenant / Multi-empresa:** Gestión de múltiples empresas por usuario con aislamiento absoluto de datos a nivel de base de datos (RLS).
* **Operación Comercial Sin Costes Ocultos:** Alojamiento en infraestructura serverless sin limitaciones de monetización (Cloudflare + Supabase).
* **Documentación Viva y Auditoría Continua:** Implementación de una bóveda técnica en **Obsidian** que centralice especificaciones formales, registros de decisiones de arquitectura (ADR), trazabilidad de requisitos tributarios y la Memoria Técnica obligatoria.

---

## 2. Marco Normativo y Especificaciones Fiscales (Veri*factu)

El sistema debe implementar los siguientes mecanismos técnicos de forma obligatoria:

### 2.1. Inmutabilidad y No Manipulación
* Queda terminantemente prohibido el borrado físico (`DELETE`) o la edición (`UPDATE`) de campos económicos y fiscales de facturas una vez emitidas.
* Cualquier error en una factura ya expedida debe corregirse exclusivamente mediante la emisión de una **Factura Rectificativa** (Serie `R-YYYY`).

### 2.2. Encadenamiento Criptográfico (SHA-256)
Cada factura debe calcular una huella digital que dependa matemáticamente del registro anterior de su misma serie y año:
* **Cadena Canónica:** Estructura fija de campos concatenados sin espacios superfluos:  
  `NIF_EMISOR & NUMERO_FACTURA & FECHA_EXPEDICION_UTC & TOTAL_DECIMAL & HASH_ANTERIOR`
* **Semilla de Inicio:** Si la factura es la primera del año fiscal (`0001`), el valor de `HASH_ANTERIOR` debe ser una cadena vacía `""`.
* **Formato del Hash:** Salida en hexadecimal de 64 caracteres en mayúsculas.

### 2.3. Código QR y Leyenda Obligatoria
* Todo documento impreso o exportado a PDF debe incorporar un código QR de tamaño entre **20x20 mm** y **40x40 mm**.
* **URL Normalizada de Cotejo:**  
  `https://sede.agenciatributaria.gob.es/veri-factu?nif=[NIF]&num=[NUM]&fecha=[AAAA-MM-DD]&total=[0.00]&huella=[8_PRIMEROS_CARACTERES_HASH]`
* Leyenda adyacente visible: *"Factura verificable en la sede electrónica de la AEAT"*.

### 2.4. Registro de Eventos del Sistema (Audit Log)
Registro inmutable de acciones del sistema: arranques, paradas, logins, emisión de facturas, cambios de configuración fiscal e intentos bloqueados de mutación de datos.

---

## 3. Arquitectura del Sistema & Stack Tecnológico

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND & SSR (EDGE)                    │
│   Next.js App Router + TypeScript + Tailwind CSS       │
│   Desplegado en Cloudflare Pages / Workers             │
└───────────────────────────┬────────────────────────────┘
                            │ Server Actions / API Routes
┌───────────────────────────▼────────────────────────────┐
│              CAPA DE NEGOCIO Y FISCALIDAD              │
│   - Motor Criptográfico SHA-256 (Web Crypto API)       │
│   - Validación de Esquemas y Tipos (Zod)                │
│   - Generador Vectorial de PDFs (@react-pdf/renderer)  │
└───────────────────────────┬────────────────────────────┘
                            │ Drizzle ORM (Pooler Mode)
┌───────────────────────────▼────────────────────────────┐
│            PERSISTENCIA Y SEGURIDAD (ACID)             │
│   PostgreSQL (Supabase) + Row Level Security (RLS)     │
│   - Transacciones bloqueantes (SELECT FOR UPDATE)      │
│   - Triggers SQL de inmutabilidad                      │
└────────────────────────────────────────────────────────┘
```

---

## 4. Especificación del Modelo de Datos Relacional

El desarrollador debe implementar el esquema en PostgreSQL asegurando los siguientes tipos y restricciones:

| Entidad | Campos Clave | Reglas & Restricciones |
| :--- | :--- | :--- |
| **`companies`** | `id`, `name`, `tax_id`, `address`, `postal_code`, `city`, `verifactu_enabled` | `tax_id` único. Representa a la entidad emisora legal. |
| **`company_members`** | `id`, `company_id`, `user_id`, `role` | Control de acceso multi-tenant (Roles: `OWNER`, `ADMIN`, `MEMBER`). |
| **`invoice_series`** | `id`, `company_id`, `series_code`, `year`, `last_number`, `last_hash` | Índice único por `(company_id, series_code, year)`. Registro de correlatividad y último hash. |
| **`customers`** | `id`, `company_id`, `name`, `tax_id`, `email`, `address` | Directorio de clientes vinculados a cada organización. |
| **`invoices`** | `id`, `company_id`, `series_code`, `number`, `formatted_number`, `issue_date`, `due_date`, `subtotal_cents`, `vat_total_cents`, `total_cents`, `prev_hash`, `current_hash`, `canonical_string`, `qr_code_url`, `is_locked` | **Importes siempre en enteros (céntimos).** Trigger SQL bloquea `UPDATE` y `DELETE` si `is_locked = TRUE`. |
| **`invoice_lines`** | `id`, `invoice_id`, `description`, `quantity`, `unit_price_cents`, `vat_percent`, `vat_amount_cents`, `total_amount_cents` | Multitasa de IVA (21%, 10%, 4%, 0%) por concepto independiente. |
| **`audit_logs`** | `id`, `company_id`, `user_id`, `event_code`, `description`, `metadata`, `ip_address`, `timestamp` | Tabla de solo inserción para cumplimiento de trazabilidad. |

---

## 5. Estándar y Arquitectura de Documentación (Obsidian Knowledge Base)

La documentación del proyecto no es un entregable estático final, sino una **bóveda viva basada en Markdown estructurado (Obsidian)** integrada con el ciclo de desarrollo mediante control de versiones (Git).

### 5.1. Estructura de Carpetas del Vault (`/docs`)

```
Facturify-Vault/
├── 00_Meta/                     # Directrices de documentación, plantillas y tags
│   ├── Templates/               # Plantillas para ADRs, módulos, incidencias y pruebas
│   └── Glossary.md              # Diccionario terminológico (fiscal, técnico, contable)
├── 01_Architecture/             # Especificaciones técnicas del sistema
│   ├── Decisions_ADR/           # Architecture Decision Records (ADR-0001, ADR-0002...)
│   ├── Database_Schema/         # Diccionario de datos, ERDs y contratos Drizzle
│   └── Security_RLS/            # Políticas de aislamiento de datos y modelos de amenazas
├── 02_Verifactu_Compliance/     # Trazabilidad fiscal y normativa AEAT
│   ├── RD_1007_2023_Analysis.md # Mapeo de artículos vs. características del software
│   ├── Canonical_Algorithm.md   # Especificación canónica y hashing SHA-256
│   └── Event_Log_Specs.md       # Catálogo oficial de eventos de auditoría
├── 03_API_and_Workflows/        # Flujos de datos, Server Actions y transacciones
│   ├── Invoice_Issuance_Flow.md # Diagrama paso a paso de la emisión atómica
│   └── PDF_QR_Generation.md     # Estándar de coordenadas, fuentes y URLs de cotejo
├── 04_Quality_and_Testing/      # Planes de prueba, suites de regresión y auditoría
│   ├── Concurrency_Tests.md     # Casos de prueba para evasión de saltos de numeración
│   └── Resilience_Tests.md      # Pruebas de resistencia ante alteración SQL directa
└── 05_Legal_and_Certification/ # Expediente técnico legal exigido por el Reglamento
    ├── Software_Declaration.md  # Borrador de la Declaración Responsable del Fabricante
    └── System_Changelog.md      # Registro inmutable de versiones y modificaciones
```

### 5.2. Convenciones de Modelado Documental en Obsidian
1. **Frontmatter Estricto (YAML):** Todo documento técnico debe iniciar con metadatos normalizados:
   * `title`, `document_id`, `type` (*spec*, *adr*, *compliance*, *guide*), `status` (*draft*, *approved*, *superseded*), `verifactu_relevant` (*boolean*), `last_updated`.
2. **Enlaces Bidireccionales (`[[Wikilinks]]`):** 
   * Cada decisión técnica (`ADR`) debe estar enlazada bidireccionalmente al requisito legal que satisface (ej: `[[RD_1007_2023_Analysis#Art-8]]`).
   * Cada tabla de base de datos documentada debe enlazar con sus flujos de acceso asociados.
3. **Diagramas y Lienzos (Obsidian Canvas / Mermaid):**
   * Empleo nativo de diagramas de secuencia Mermaid para documentar el bloqueo concurrente `SELECT FOR UPDATE` y la resolución de hashes.
   * Uso de lienzos visuales (`.canvas`) para el mapeo interactivo de la arquitectura distribuida (Cloudflare Workers ↔ Supabase).
4. **Memoria Técnica y Declaración Responsable:**
   * La carpeta `05_Legal_and_Certification/` debe mantenerse al día como la fuente directa de la que se exportará la documentación oficial requerida ante cualquier inspección tributaria de la AEAT según el Art. 12 del RD 1007/2023.

---

## 6. Fases de Ejecución del Proyecto (Roadmap de Desarrollo)

```
[FASE 1: Modelo & DB] ➔ [FASE 2: Core Verifactu] ➔ [FASE 3: PDF & QR] ➔ [FASE 4: UI/UX] ➔ [FASE 5: QA & Certificación]
         ▲                       ▲                     ▲                   ▲                    ▲
         └───────────────────────┴──────────┬──────────┴───────────────────┴────────────────────┘
                                  DOCUMENTACIÓN CONTINUA (OBSIDIAN)
```

### Fase 1: Infraestructura, Persistencia & Documentación del Modelo
1. Configurar Supabase, Drizzle ORM y variables de entorno de conexión.
2. Escribir definiciones relacionales e implementar triggers PL/pgSQL de inmutabilidad.
3. **Entregable Obsidian:** Creación de `Database_Schema/` con el diccionario de campos, tipos en céntimos y documentación de disparadores SQL.

### Fase 2: Motor Lógico, Hashing & Registro de Decisiones (ADRs)
1. Desarrollar la función de canonización y resumen criptográfico SHA-256 (`crypto.subtle`).
2. Implementar la transacción atómica de emisión (bloqueo `SELECT ... FOR UPDATE`, incremento correlativo y registro de log).
3. **Entregable Obsidian:** Documentar en `Decisions_ADR/` la estrategia de bloqueo de concurrencia y en `Canonical_Algorithm.md` la fórmula canónica con vectores de prueba numéricos.

### Fase 3: Renderizado, Matriz QR & Guía de Exportación
1. Implementar la generación de URLs normativas y codificación QR con márgenes milimétricos (20x20 a 40x40 mm).
2. Construir la plantilla PDF con `@react-pdf/renderer` y su endpoint binario serverless.
3. **Entregable Obsidian:** Redactar en `PDF_QR_Generation.md` las especificaciones de diseño, tipografía, coordenadas y reglas de contraste exigidas por la AEAT.

### Fase 4: Frontend, Experiencia de Usuario & Manual Operativo
1. Desarrollar autenticación, selector multi-empresa y formulario reactivo de cálculo multitasa e IRPF.
2. Construir dashboard financiero y módulo de exportación de informes contables.
3. **Entregable Obsidian:** Crear la sección `03_API_and_Workflows/` detallando el ciclo de vida del formulario y la sincronización con Server Actions.

### Fase 5: Pruebas de Resistencia, Auditoría & Expediente Veri*factu
1. Ejecutar pruebas de estrés de concurrencia, colisión de numeración y resistencia de triggers ante mutación directa.
2. Validar escaneos de QR y cotejo contra el entorno de pruebas de la AEAT.
3. **Entregable Obsidian:** Consolidar `04_Quality_and_Testing/` con las actas de pruebas y generar el borrador final de la `Software_Declaration.md` (Declaración Responsable del Fabricante).

---

## 7. Criterios de Aceptación para Paso a Producción

* [ ] Esquema relacional desplegado con tipos enteros en céntimos y claves foráneas estrictas.
* [ ] Triggers de inmutabilidad activos en PostgreSQL impidiendo `UPDATE` o `DELETE` sobre registros facturados.
* [ ] Generación matemática verificable de la cadena SHA-256 encadenada y reproducible.
* [ ] Códigos QR conformes con la URL canónica y dimensiones exigidas por la AEAT.
* [ ] Registro de auditoría registrando accesos, fallos de integridad y eventos críticos.
* [ ] Despliegue operativo en Cloudflare Pages / Workers dentro de límites serverless estándar.
* [ ] **Bóveda de Obsidian completamente estructurada y sincronizada:** Diccionario de datos, ADRs, especificaciones de algoritmos y catálogo de eventos al día.
* [ ] **Expediente de Cumplimiento Veri\*factu finalizado:** Redacción de la Memoria Técnica del Sistema y firma de la Declaración Responsable del Fabricante (Art. 12 RD 1007/2023).