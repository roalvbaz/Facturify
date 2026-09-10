/**
 * Utilidades de contraste de color.
 *
 * Garantizan que el texto sobre un fondo coloreado sea SIEMPRE legible por
 * construcción: se compara el contraste real (WCAG) del blanco y del negro
 * contra el fondo y se elige el más legible. Así ninguna plantilla de factura
 * puede producir una cabecera ilegible aunque su color se elija a mano.
 */

/** Convierte un color hex (#rgb / #rrggbb) a componentes RGB 0-255. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const match = /^([0-9a-f]{6})$/i.exec(h);
  if (!match) return null;
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16),
  };
}

/** Luminancia relativa WCAG (0-1). */
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos luminancias (1-21). */
function contrastRatio(l1: number, l2: number): number {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

const TEXT_LIGHT = '#ffffff'; // sobre fondos oscuros
const TEXT_DARK = '#0f172a'; // sobre fondos claros
const LUM_DARK_TEXT = relativeLuminance(TEXT_DARK); // ~0.015

/**
 * True si el color es "claro"-ish (luminancia > 0.5), útil para previsualizar.
 */
export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.5;
}

/**
 * Devuelve el color de texto (blanco u oscuro) que MÁS contraste tiene
 * contra el fondo dado — siempre el más legible de los dos.
 */
export function readableTextOn(hex: string): string {
  const l = relativeLuminance(hex);
  const cWhite = contrastRatio(1, l);
  const cDark = contrastRatio(LUM_DARK_TEXT, l);
  return cWhite >= cDark ? TEXT_LIGHT : TEXT_DARK;
}

/**
 * Para fondos con gradiente: mezcla los dos colores (el punto medio es el de
 * peor contraste) y devuelve el texto legible sobre ese punto medio.
 */
export function readableTextOnGradient(c1: string, c2: string): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return readableTextOn(c1);
  const mid = `#${[a.r, a.g, a.b]
    .map((v, i) => {
      const m = Math.round((v + [b.r, b.g, b.b][i]) / 2);
      return m.toString(16).padStart(2, '0');
    })
    .join('')}`;
  return readableTextOn(mid);
}