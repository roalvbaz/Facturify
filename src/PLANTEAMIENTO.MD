# 📄 FACTURIFY — Plan Director de Proyecto & Especificación Técnica

> **Versión del Documento:** 2.0.0  
> **Estado:** Fase de Diseño & Especificación de Requisitos  
> **Ámbito Normativo:** Ley 11/2021, Real Decreto 1007/2023 y Orden HAC/1177/2024 (Reglamento Veri*factu - España)  
> **Arquitectura Objetivo:** Next.js (App Router) + TypeScript + PostgreSQL (Supabase) + Cloudflare Pages/Workers + Drizzle ORM  

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

---

## 1. Resumen Ejecutivo del Proyecto

**Facturify** es un software de facturación B2B en la nube (*Software as a Service*) diseñado para autónomos y pequeñas/medianas empresas en España. Su objetivo prioritario es permitir la emisión de facturas ordinarias y rectificativas con plena validez legal, garantizando la inalterabilidad, trazabilidad y verificación tributaria exigida por el **Reglamento Veri\*factu de la AEAT**.

### Objetivos Principales:
* **Cumplimiento Normativo Total:** Cumplir el Art. 29.2.j de la Ley General Tributaria y el RD 1007/2023 evitando sanciones por software no certificado.
* **Integridad Transaccional:** Eliminar colisiones de numeración y saltos en las series correlativas anuales.
* **Multi-tenant / Multi-empresa:** Gestión de múltiples empresas por usuario con aislamiento absoluto de datos a nivel de base de datos.
* **Operación Comercial Sin Costes Ocultos:** Alojamiento en infraestructura serverless sin limitaciones de monetización (Cloudflare + Supabase).

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
┌────────────────────────────────────────────────────────┐
│               FRONTEND & SSR (EDGE)                   │
│   Next.js App Router + TypeScript + Tailwind CSS       │
│   Desplegado en Cloudflare Pages / Workers             │
└───────────────────────────┬────────────────────────────┘
│ Server Actions / API Routes
┌───────────────────────────▼────────────────────────────┐
│              CAPA DE NEGOCIO Y FISCALIDAD              │
│   - Motor Criptográfico SHA-256 (Web Crypto API)       │
│   - Validación de Esquemas y Tipos (Zod)               │
│   - Generador Vectorial de PDFs (@react-pdf/renderer)  │
└───────────────────────────┬────────────────────────────┘
│ Drizzle ORM (Pooler Mode)
┌───────────────────────────▼────────────────────────────┐
│            PERSISTENCIA Y SEGURIDAD (ACID)             │
│   PostgreSQL (Supabase) + Row Level Security (RLS)     │
│   - Transacciones bloqueantes (SELECT FOR UPDATE)      │
│   - Triggers SQL de inmutabilidad                      │
└────────────────────────────────────────────────────────┘
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

## 5. Fases de Ejecución del Proyecto (Roadmap de Desarrollo)

[FASE 1: Modelo & DB] ➔ [FASE 2: Core Fiscal Veri*factu] ➔ [FASE 3: PDF & QR] ➔ [FASE 4: UI/UX] ➔ [FASE 5: QA & Auditoría]


### Fase 1: Infraestructura y Persistencia (Base de Datos)
1. Configurar el proyecto en Supabase y definir las variables de entorno de conexión segura.
2. Escribir las definiciones de tablas con Drizzle ORM respetando los tipos de datos en céntimos (`bigint`/`integer`).
3. Crear los triggers PL/pgSQL en la base de datos para impedir mutaciones en registros bloqueados.
4. Configurar el pool de conexiones compatible con el entorno Edge de Cloudflare.

### Fase 2: Motor Lógico y Criptográfico (Backend)
1. Desarrollar la función de formateo canónico según el estándar técnico de la AEAT.
2. Implementar el generador de resumen SHA-256 utilizando la API nativa `crypto.subtle`.
3. Escribir el procedimiento transaccional atómico de emisión de factura:
   * Bloqueo de fila en `invoice_series` mediante `SELECT ... FOR UPDATE`.
   * Incremento del contador numérico correlativo sin huecos.
   * Obtención del `last_hash` anterior y cómputo del `current_hash`.
   * Inserción simultánea de cabecera (`invoices`) y líneas (`invoice_lines`).
   * Actualización del estado de la serie con el nuevo número y nuevo hash.
   * Registro del evento `EVT_INVOICE_ISSUED` en `audit_logs`.

### Fase 3: Renderizado de Facturas y Código QR
1. Implementar la utilidad de generación de URLs oficiales y matrices de datos para el QR.
2. Diseñar la plantilla de factura mediante `@react-pdf/renderer` asegurando dimensiones milimétricas exactas para el QR (mínimo 20x20 mm).
3. Construir el endpoint serverless que genere y devuelva el archivo PDF binario al cliente.

### Fase 4: Interfaz de Usuario y Experiencia (Frontend)
1. Construir el sistema de autenticación y selección de organización activa.
2. Desarrollar el formulario de facturación dinámico: cálculo reactivo de bases imponibles multitasa, cuotas de IVA, retenciones IRPF y totales en tiempo real.
3. Crear el panel de control financiero (KPIs de ingresos, facturas pendientes, cobradas y gráficos).
4. Implementar el listado de facturas con filtros avanzados y exportación a Excel estructurado para gestorías.

### Fase 5: Pruebas de Carga, Seguridad y Validación Fiscal
1. **Test de Concurrencia:** Simular peticiones simultáneas de emisión para verificar que no existen duplicidades de número ni desincronización de hashes.
2. **Test de Resistencia:** Intentar modificar o borrar una factura emitida mediante cliente SQL directo para verificar el bloqueo del trigger.
3. **Test de Escaneo:** Escanear los códigos QR generados con dispositivos móviles y comprobar que la URL contiene los parámetros exactos exigidos por la AEAT.

---

## 6. Criterios de Aceptación para Paso a Producción

* [ ] Esquema relacional desplegado con tipos enteros en céntimos y claves foráneas estrictas.
* [ ] Triggers de inmutabilidad activos en PostgreSQL impidiendo `UPDATE` o `DELETE` sobre registros facturados.
* [ ] Generación matemática verificable de la cadena SHA-256 encadenada.
* [ ] Códigos QR conformes con la URL de la sede electrónica de la AEAT.
* [ ] Registro de auditoría registrando accesos y eventos críticos.
* [ ] Despliegue operativo en Cloudflare Pages sin dependencias de planes de pago comerciales restrictivos.
* [ ] Redacción y firma de la Declaración Responsable del Fabricante del Software.