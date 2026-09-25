/**
 * The preview to show in a frame `targetWidth` pixels wide: the smallest one at least that wide,
 * otherwise the largest. Without a target, the largest.
 *
 * Mirrors pickPreviewVariant in ag-go-api/src/modules/render/render-sizes.ts.
 */
export function pickPreviewVariant<T extends { width: number | null }>(
  variants: T[],
  targetWidth?: number,
): T | undefined {
  const sorted = [...variants].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  if (targetWidth && targetWidth > 0) {
    const fitting = sorted.find((variant) => (variant.width ?? 0) >= targetWidth);
    if (fitting) {
      return fitting;
    }
  }
  return sorted.at(-1);
}
