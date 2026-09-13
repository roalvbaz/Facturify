/**
 * Fuentes de las plantillas de factura — carga SERVER-SIDE para el PDF.
 *
 * @react-pdf solo dibuja las fuentes que tiene REGISTRADAS. Las plantillas
 * usan familias web (Inter, Space Grotesk, JetBrains Mono) que no vienen
 * incrustadas en el renderer, así que se descargan UNA VEZ desde Google Fonts
 * (css2 + ficheros woff2), se cachean en memoria del proceso y se registran
 * con sus pesos 400 y 700.
 *
 * Robustez: cada fetch tiene timeout y se cachea el resultado (éxito o fallo).
 * Si la red no responde, `resolvePdfFont` cae en una fuente estándar del PDF
 * del mismo género (Helvetica/Times-Roman/Courier) y el documento se genera
 * igualmente — nunca se cuelga ni se rompe por culpa de una fuente.
 */

import { Font } from '@react-pdf/renderer';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Space+Grotesk:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap';

/** Nombre canónico (el que registramos en @react-pdf) por familia de plantilla. */
const PROPER_NAMES: Record<string, string> = {
  inter: 'Inter',
  'space grotesk': 'Space Grotesk',
  'jetbrains mono': 'JetBrains Mono',
};

const GOOGLE_KEYS = new Set(Object.keys(PROPER_NAMES));

let fontsPromise: Promise<void> | null = null;
const registeredFamilies = new Set<string>();

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/^['"]|['"]$/g, '');
}

async function fetchBuffer(url: string, timeoutMs: number): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function loadFontsOnce(): Promise<void> {
  if (fontsPromise) return fontsPromise;

  fontsPromise = (async () => {
    try {
      const cssBuf = await fetchBuffer(CSS_URL, 7000);
      if (!cssBuf) return;
      const css = cssBuf.toString('utf-8');
      const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];

      // familia → peso → url del fichero
      const byFamily: Record<string, Record<string, string>> = {};
      for (const block of blocks) {
        const fam = /font-family:\s*'([^']+)'/.exec(block)?.[1];
        const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
        const url = /url\(([^)]+)\)/.exec(block)?.[1];
        if (!fam || !weight || !url) continue;
        const key = normalizeToken(fam);
        if (!GOOGLE_KEYS.has(key)) continue;
        (byFamily[key] ??= {})[weight] = url.replace(/["']/g, '');
      }

      for (const [key, weights] of Object.entries(byFamily)) {
        const name = PROPER_NAMES[key];
        const regular = weights['400'] ? await fetchBuffer(weights['400'], 7000) : null;
        const bold = weights['700'] ? await fetchBuffer(weights['700'], 7000) : null;

        // @react-pdf espera que `src` sea una URL o un data URI (string).
        // Un Buffer rompe el render: su loader hace `src.substring(...)` y un
        // Buffer no tiene `.substring` → "dataUrl.substring is not a function".
        const fonts: { src: string; fontWeight: number }[] = [];
        if (regular) {
          fonts.push({ src: `data:font/woff2;base64,${regular.toString('base64')}`, fontWeight: 400 });
        }
        if (bold) {
          fonts.push({ src: `data:font/woff2;base64,${bold.toString('base64')}`, fontWeight: 700 });
        }
        if (fonts.length === 0) continue;

        try {
          Font.register({ family: name, fonts });
          registeredFamilies.add(name);
        } catch {
          // una fuente que no registra no rompe el PDF: se usa la estándar
        }
      }
    } catch {
      // sin red → documentos con fuentes estándar incrustadas
    }
  })();

  return fontsPromise;
}

/**
 * Asegura que las fuentes web de plantilla estén cargadas antes de renderizar.
 * Best-effort: si falla la red, se resuelve igual con las fuentes estándar.
 */
export function ensurePdfFontsLoaded(): Promise<void> {
  return loadFontsOnce();
}

/**
 * Resuelve el stack `fontFamily` de una plantilla a una fuente que @react-pdf
 * conoce de verdad: web registrada → su nombre canónico; genérica/huérfana →
 * la estándar del mismo género (Times-Roman para serif, Courier para mono,
 * Helvetica para el resto).
 */
export function resolvePdfFont(fontFamilyStack?: string | null): string {
  if (!fontFamilyStack || !fontFamilyStack.trim()) return 'Helvetica';
  const first = normalizeToken(fontFamilyStack.split(',')[0]);

  if (GOOGLE_KEYS.has(first)) {
    const proper = PROPER_NAMES[first];
    if (registeredFamilies.has(proper)) return proper;
  }
  if (/(serif|georgia|times)/i.test(first)) return 'Times-Roman';
  if (/(mono|courier)/i.test(first)) return 'Courier';
  return 'Helvetica';
}