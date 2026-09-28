/**
 * Fonts offered by the watermark settings. Every family here must be installed in the API image
 * (ag-go-api/Dockerfile, ag-go-api/fonts), otherwise the server falls back to DejaVu Sans.
 * `google` is the Google Fonts axis spec used to load the family for the browser preview; families
 * without it rely on the viewer's system fonts.
 */
export type WatermarkFont = {
  family: string;
  category: 'sans-serif' | 'serif' | 'monospace';
  google?: string;
};

export const WATERMARK_FONTS: WatermarkFont[] = [
  { family: 'Arial', category: 'sans-serif' },
  { family: 'Roboto', category: 'sans-serif', google: 'wght@100..900' },
  { family: 'Open Sans', category: 'sans-serif', google: 'wght@300..800' },
  { family: 'Noto Sans', category: 'sans-serif', google: 'wght@100..900' },
  { family: 'DejaVu Sans', category: 'sans-serif' },
  { family: 'Times New Roman', category: 'serif' },
  { family: 'Noto Serif', category: 'serif', google: 'wght@100..900' },
  { family: 'DejaVu Serif', category: 'serif' },
  { family: 'Courier New', category: 'monospace' },
  { family: 'DejaVu Sans Mono', category: 'monospace' },
];

/** CSS font shorthand for canvas, with a generic fallback matching the family's category. */
export function getWatermarkCssFont(family: string, weight: number, size: number): string {
  const category = WATERMARK_FONTS.find((font) => font.family === family)?.category ?? 'sans-serif';
  return `${weight} ${size}px "${family.replace(/["\\]/g, '')}", ${category}`;
}

const stylesheets = new Map<string, Promise<void>>();

function loadGoogleStylesheet(family: string, axes: string): Promise<void> {
  let loaded = stylesheets.get(family);
  if (!loaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axes}&display=swap`;
    loaded = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    document.head.appendChild(link);
    stylesheets.set(family, loaded);
  }
  return loaded;
}

/**
 * Makes the family usable on a canvas: injects its Google Fonts stylesheet once, then waits for
 * the requested weight. Never throws; the canvas falls back to another font when loading fails.
 */
export async function loadWatermarkFont(family: string, weight: number): Promise<void> {
  const font = WATERMARK_FONTS.find((item) => item.family === family);
  if (font?.google) {
    await loadGoogleStylesheet(family, font.google);
  }
  try {
    await document.fonts?.load(getWatermarkCssFont(family, weight, 16), 'AaĂăƠơ');
  } catch {
    // Keep the fallback font.
  }
}
