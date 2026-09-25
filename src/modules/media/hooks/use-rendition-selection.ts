import { useLayoutEffect, useState, type RefObject } from 'react';
import type { PreviewVariant } from '../api/media';
import { pickPreviewVariant } from '../utils/pick-preview-variant';

export const AUTO_QUALITY = 'auto';
const QUALITY_STORAGE_KEY = 'ag-go.media.previewQuality';

function readStoredQuality(): string {
  try {
    return window.localStorage.getItem(QUALITY_STORAGE_KEY) ?? AUTO_QUALITY;
  } catch {
    return AUTO_QUALITY;
  }
}

function storeQuality(value: string) {
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the choice then only lasts for this view.
  }
}

/** Width of an element in CSS pixels, kept up to date while it resizes. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Chooses which watermarked preview size to show. "Auto" picks the smallest preview covering the
 * frame at the screen's pixel density; the viewer can force a size, remembered across media.
 */
export function useRenditionSelection(
  variants: PreviewVariant[],
  frameRef: RefObject<HTMLElement | null>,
) {
  const frameWidth = useElementWidth(frameRef);
  const [quality, setQuality] = useState(readStoredQuality);
  const autoVariant =
    frameWidth > 0
      ? pickPreviewVariant(variants, frameWidth * (window.devicePixelRatio || 1))
      : undefined;
  const manualVariant =
    quality === AUTO_QUALITY
      ? undefined
      : variants.find((variant) => String(variant.width) === quality);
  return {
    quality: manualVariant ? quality : AUTO_QUALITY,
    autoVariant,
    selected: manualVariant ?? autoVariant,
    setQuality: (value: string) => {
      setQuality(value);
      storeQuality(value);
    },
  };
}
