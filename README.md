# Facturify — Veri*factu (cumplimiento AEAT)

Módulo de cumplimiento **Veri*factu** (RD 1007/2023 y Orden HAC/1177/2024) para
remitir cada factura emitida a la Agencia Tributaria. Cada **empresa sube su
propio certificado digital** desde Configuración; el PFX se guarda cifrado
(AES-256-GCM) en `company_settings` y se usa como certificado de cliente TLS en
la llamada SOAP.

## Arquitectura (flujo)

```
Emitir factura
  └─ buildAltaXML/AnulacionXML (xml/builder.ts)
       └─ encolar en verifactu_submissions (queue/manager.ts)
            └─ cron /api/cron/verifactu cada 60s (queue/processor.ts)
                 ├─ descifrar PFX de la empresa
                 ├─ submitToVerifactu → SOAP a la AEAT (soap/client.ts)
                 └─ CONFORME (+CSV) · reintento backoff 1m→5m→15m→1h→4h · ERROR
```

Estado visible por factura en **Historial** (columna "Veri*factu").

## Probar en local (no toca la AEAT)

Unit tests del generador XML, cifrado, parseo de certificados y cola:

```bash
npx vitest run
```

Generar un PFX **self-signed** para probar parseo/cifrado sin certificado real:

```bash
npx tsx scripts/make-test-cert.ts facturify-test-cert.pfx mi-contraseña
```

## Probar contra el sandbox de la AEAT

### 1. Obtener el certificado de pruebas

El sandbox exige un **certificado de pruebas emitido por la propia AEAT**
(no vale el self-signed). Se solicita en la sede electrónica de la Agencia
Tributaria → apartado **Veri*factu / Pruebas (ensayo)**. Descarga el PFX con su
contraseña.

### 2. Configurar `.env`

```env
SANDBOX_PFX_PATH=C:/ruta/al/certificado-de-pruebas.pfx
SANDBOX_PFX_PASSWORD=contraseña-del-pfx
SANDBOX_NIF_EMISOR=BXXXXXXXX        # NIF que consta en el certificado
# (alternativa a SANDBOX_PFX_PATH: SANDBOX_PFX_BASE64=<base64 del pfx>)
```

### 3. Enviar la factura de prueba

```bash
npx tsx scripts/test-sandbox.ts
# opciones: --nif=BXXXXXXXX --importe=121.00 --desc="Factura de prueba"
```

El script construye un XML de alta, lo envía al endpoint de preproducción y
vuelca el resultado: **CSV**, estado (Conforme / No conforme) y errores. Si la
respuesta SOAP no pudo parsearse, se guarda completa en `sandbox-response.xml`.
Exit code 0 = aceptado.

## Pasos para producción

| Paso | Cómo |
|---|---|
| 1. Cron en Render | Cron job → `GET https://TU-APP/api/cron/verifactu` cada 60s, header `Authorization: Bearer $VERIFACTU_CRON_SECRET` |
| 2. Variables en Render | `CERT_ENCRYPTION_KEY` (`openssl rand -hex 32`), `VERIFACTU_CRON_SECRET`, `AEAT_ENVIRONMENT=sandbox` al inicio |
| 3. Cada empresa sube su PFX | Configuración → "Certificado Digital AEAT" (cifrado en BD, por empresa) |
| 4. Verificación end-to-end | Emitir factura → aparece en `verifactu_submissions` → el cron la envía → badge CONFORME + CSV guardado |

> Antes de pasar a producción con `AEAT_ENVIRONMENT=production`, valida la
> operativa completa en sandbox y revisa que el certificado de cada empresa sea
> el de su titular (nunca un certificado compartido por la plataforma).

## Estructura del módulo

- `src/lib/verifactu/xml/` — generador XML (types, constants, builder)
- `src/lib/verifactu/soap/` — endpoints + cliente SOAP con certificado cliente
- `src/lib/verifactu/canonical.ts` `/ crypto.ts` `/ qr.ts` — hash encadenado y QR
- `src/lib/verifactu/certificate.ts` — parseo PFX→PEM + agente TLS
- `src/lib/verifactu/cipher.ts` — cifrado AES-256-GCM del PFX en BD
- `src/lib/verifactu/queue/` — cola con reintentos exponenciales
- `src/app/api/cron/verifactu/` — cron job procesador
- `src/app/api/verifactu/status/[invoiceId]/` — estado por factura
- `src/actions/company.actions.ts` — subir/quitar/consultar certificado por empresa
- `scripts/` — make-test-cert.ts y test-sandbox.ts
- `supabase/MASTER_SCHEMA.sql` — esquema completo (13 tablas)