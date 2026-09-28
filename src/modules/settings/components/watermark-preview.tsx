import { useEffect, useRef } from 'react';
import type { WatermarkConfig } from '../../render/api/render';
import { getWatermarkCssFont, loadWatermarkFont } from '../../render/utils/watermark-fonts';
import {
  getOverlayPosition,
  getSingleWatermarkTileScale,
  getWatermarkMargin,
  getWatermarkTileGeometry,
  getWatermarkUnitScale,
  WATERMARK_REFERENCE_WIDTH,
} from '../../render/utils/watermark-layout';

type WatermarkPreviewProps = {
  sampleUrl?: string;
  logoUrl?: string;
  config: WatermarkConfig;
  enabled: boolean;
};

const DEFAULT_SAMPLE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#1677ff"/><stop offset="1" stop-color="#722ed1"/>
    </linearGradient></defs>
    <rect width="960" height="540" fill="url(#g)"/>
    <circle cx="760" cy="120" r="160" fill="rgba(255,255,255,.14)"/>
    <text x="48" y="480" fill="white" font-size="34" font-family="Arial">Watermark preview</text>
  </svg>
`)}`;

function loadImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : undefined);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

/** Unrotated logo + text tile, laid out like the server renderer. */
function drawTile(
  config: WatermarkConfig,
  text: string,
  logo: HTMLImageElement | undefined,
  fontSize: number,
): HTMLCanvasElement {
  const geometry = getWatermarkTileGeometry(fontSize, Boolean(logo), config.logoScale);
  const font = getWatermarkCssFont(config.fontFamily, config.fontWeight, fontSize);
  const measure = document.createElement('canvas').getContext('2d');
  if (measure) {
    measure.font = font;
  }
  const textWidth = text && measure ? measure.measureText(text).width : 0;
  const tile = document.createElement('canvas');
  tile.width = Math.max(1, Math.ceil(text ? geometry.textX + textWidth : geometry.logoSize));
  tile.height = Math.max(1, Math.ceil(geometry.height));
  const context = tile.getContext('2d');
  if (!context) {
    return tile;
  }
  if (logo) {
    // Fitted inside the logo square on whole pixels, like the server's pre-resized logo.
    const ratio = Math.min(
      geometry.logoSize / logo.naturalWidth,
      geometry.logoSize / logo.naturalHeight,
    );
    const width = Math.max(1, Math.round(logo.naturalWidth * ratio));
    const height = Math.max(1, Math.round(logo.naturalHeight * ratio));
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      logo,
      Math.floor((geometry.logoSize - width) / 2),
      geometry.logoY + Math.floor((geometry.logoSize - height) / 2),
      width,
      height,
    );
  }
  if (text) {
    context.font = font;
    context.fillStyle = config.color;
    context.textBaseline = 'alphabetic';
    context.fillText(text, geometry.textX, geometry.textBaselineY);
  }
  return tile;
}

function rotateTile(tile: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (!degrees) {
    return tile;
  }
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotated = document.createElement('canvas');
  rotated.width = Math.max(1, Math.ceil(tile.width * cos + tile.height * sin));
  rotated.height = Math.max(1, Math.ceil(tile.width * sin + tile.height * cos));
  const context = rotated.getContext('2d');
  if (context) {
    context.translate(rotated.width / 2, rotated.height / 2);
    context.rotate(radians);
    context.drawImage(tile, -tile.width / 2, -tile.height / 2);
  }
  return rotated;
}

/**
 * Canvas preview of the watermark on a 960px wide frame. It follows the same layout rules as the
 * server (watermark-layout.ts), so what is shown here is what previews and thumbnails get.
 * Text is drawn with the browser's fonts, which may differ slightly from the server's.
 */
export function WatermarkPreview({ sampleUrl, logoUrl, config, enabled }: WatermarkPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;

    const draw = async () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        return;
      }
      const [image, logo] = await Promise.all([
        loadImage(sampleUrl || DEFAULT_SAMPLE),
        logoUrl ? loadImage(logoUrl) : Promise.resolve(undefined),
        loadWatermarkFont(config.fontFamily, config.fontWeight),
      ]);
      if (disposed) {
        return;
      }

      const width = WATERMARK_REFERENCE_WIDTH;
      const height = image
        ? Math.max(1, Math.round((width * image.naturalHeight) / image.naturalWidth))
        : 540;
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      if (image) {
        context.drawImage(image, 0, 0, width, height);
      }

      const text = config.text.trim().slice(0, 120);
      if (!enabled || (!text && !logo)) {
        return;
      }

      const unitScale = getWatermarkUnitScale(width);
      const margin = getWatermarkMargin(config.margin, width, height);
      context.save();
      context.globalAlpha = config.opacity;
      if (config.repeat) {
        const tile = rotateTile(
          drawTile(config, text, logo, config.fontSize * unitScale),
          config.rotate,
        );
        const stepX = tile.width + Math.round(config.gapX * unitScale);
        const stepY = tile.height + Math.round(config.gapY * unitScale);
        for (let y = 0; y < height; y += stepY) {
          for (let x = 0; x < width; x += stepX) {
            context.drawImage(tile, x, y);
          }
        }
      } else {
        // Sized from the default logo size so `logoScale` resizes the logo, not the text.
        const referenceWidth = drawTile(
          { ...config, logoScale: 1 },
          text,
          logo,
          config.fontSize,
        ).width;
        const tileScale = getSingleWatermarkTileScale(referenceWidth, width, config.scale);
        const tile = rotateTile(
          drawTile(config, text, logo, config.fontSize * tileScale),
          config.rotate,
        );
        // Oversized watermarks hang off the frame and are clipped, like on the server.
        const position = getOverlayPosition(
          width,
          height,
          tile.width,
          tile.height,
          config.position,
          margin,
        );
        context.drawImage(tile, position.left, position.top);
      }
      context.restore();
    };

    void draw();
    return () => {
      disposed = true;
    };
  }, [config, enabled, logoUrl, sampleUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', borderRadius: 8, background: '#f5f5f5' }}
    />
  );
}
