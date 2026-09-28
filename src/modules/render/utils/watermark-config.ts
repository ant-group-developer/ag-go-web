import {
  WATERMARK_POSITIONS,
  type WatermarkConfig,
  type WatermarkFontWeight,
  type WatermarkPosition,
} from '../api/render';

// Mirrors ag-go-api/src/modules/render/watermark-config.ts.
export const WATERMARK_LIMITS = {
  fontSize: { min: 8, max: 400 },
  scale: { min: 0.05, max: 3 },
  logoScale: { min: 0.2, max: 6 },
} as const;

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  text: 'AG Go Preview',
  logoAssetId: null,
  color: '#FFFFFF',
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 400,
  logoScale: 1,
  repeat: false,
  gapX: 220,
  gapY: 100,
  rotate: 0,
  maxWidth: null,
  position: 'bottom-right',
  opacity: 0.75,
  scale: 0.28,
  margin: 24,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number, round = false) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, value));
  return round ? Math.round(clamped) : clamped;
}

export function normalizeWatermarkConfig(
  config: Partial<WatermarkConfig> | null | undefined,
): WatermarkConfig {
  const defaults = DEFAULT_WATERMARK_CONFIG;
  return {
    text: typeof config?.text === 'string' ? config.text.slice(0, 200) : defaults.text,
    logoAssetId:
      typeof config?.logoAssetId === 'string' && config.logoAssetId.length > 0
        ? config.logoAssetId
        : null,
    color:
      typeof config?.color === 'string' && /^#[0-9a-f]{6}$/i.test(config.color)
        ? config.color
        : defaults.color,
    fontFamily:
      typeof config?.fontFamily === 'string' && config.fontFamily.trim().length > 0
        ? config.fontFamily.trim().slice(0, 80)
        : defaults.fontFamily,
    fontSize: clampNumber(
      config?.fontSize,
      WATERMARK_LIMITS.fontSize.min,
      WATERMARK_LIMITS.fontSize.max,
      defaults.fontSize,
      true,
    ),
    fontWeight: (typeof config?.fontWeight === 'number' && Number.isFinite(config.fontWeight)
      ? Math.min(900, Math.max(100, Math.round(config.fontWeight / 100) * 100))
      : defaults.fontWeight) as WatermarkFontWeight,
    logoScale: clampNumber(
      config?.logoScale,
      WATERMARK_LIMITS.logoScale.min,
      WATERMARK_LIMITS.logoScale.max,
      defaults.logoScale,
    ),
    repeat: typeof config?.repeat === 'boolean' ? config.repeat : defaults.repeat,
    gapX: clampNumber(config?.gapX, 40, 2000, defaults.gapX, true),
    gapY: clampNumber(config?.gapY, 40, 2000, defaults.gapY, true),
    rotate: clampNumber(config?.rotate, -360, 360, defaults.rotate),
    maxWidth:
      typeof config?.maxWidth === 'number' && Number.isFinite(config.maxWidth)
        ? clampNumber(config.maxWidth, 1, 10000, 1, true)
        : null,
    position: WATERMARK_POSITIONS.includes(config?.position as WatermarkPosition)
      ? (config?.position as WatermarkPosition)
      : defaults.position,
    opacity: clampNumber(config?.opacity, 0, 1, defaults.opacity),
    scale: clampNumber(
      config?.scale,
      WATERMARK_LIMITS.scale.min,
      WATERMARK_LIMITS.scale.max,
      defaults.scale,
    ),
    margin: clampNumber(config?.margin, 0, 500, defaults.margin, true),
  };
}
