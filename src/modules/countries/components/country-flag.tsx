import type { CSSProperties } from 'react';

export interface CountryFlagProps {
  flagUrl?: string | null;
  code?: string | null;
  name?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * CountryFlag displays the country flag preserving its original aspect ratio ("nguyên gốc").
 * Does not use Avatar component, avoiding square/circular cropping distortions.
 */
export function CountryFlag({
  flagUrl,
  code,
  name,
  height = 14,
  className,
  style,
}: CountryFlagProps) {
  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt={name || code || 'Flag'}
        loading="lazy"
        className={className}
        style={{
          height,
          width: 'auto',
          maxWidth: Math.round(height * 2.2),
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: 2,
          boxShadow: '0 0 1px rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
          ...style,
        }}
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  if (code) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(9, Math.round(height * 0.7)),
          fontWeight: 600,
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          borderRadius: 2,
          padding: '0 3px',
          height,
          minWidth: Math.round(height * 1.3),
          lineHeight: 1,
          flexShrink: 0,
          ...style,
        }}
      >
        {code.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return null;
}
