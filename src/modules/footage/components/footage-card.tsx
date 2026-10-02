import { Tag, Tooltip } from 'antd';
import { Monitor, Smartphone, Square } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatMs,
  ORIENTATION_LABELS_VI,
  qualityStars,
  RESOLUTION_LABELS,
  resolutionOf,
  type FootageVideo,
} from '../api/footage';
import { useFootageVideoMedia } from '../hooks/use-footage';

interface FootageCardProps {
  item: FootageVideo;
  onClick: () => void;
}

function OrientationIcon({ orientation }: { orientation: FootageVideo['orientation'] }) {
  if (orientation === 'portrait') return <Smartphone size={13} style={{ color: '#6b7280' }} />;
  if (orientation === 'square') return <Square size={13} style={{ color: '#6b7280' }} />;
  return <Monitor size={13} style={{ color: '#6b7280' }} />;
}

export function FootageCard({ item, onClick }: FootageCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazily fetch video media only once user hovers.
  const videoMedia = useFootageVideoMedia(hovered ? item.assetId : null);
  const previewUrl = videoMedia.data?.previewUrl ?? null;

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHovered(true), 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(false);
  }, []);

  const topTags = item.tags.slice(0, 3);
  const resolution = resolutionOf(item.width, item.height);
  const stars = qualityStars(item.quality);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#fff',
        transition: 'box-shadow 0.15s ease',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail / preview area */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          background: '#111',
          overflow: 'hidden',
        }}
      >
        {hovered && previewUrl ? (
          <video
            src={previewUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.titleVi || item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: 12 }}>{t('footage.noKeyframe')}</span>
          </div>
        )}

        {/* Duration badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMs(item.durationMs)}
        </div>

        {/* Resolution badge */}
        {resolution && (
          <Tooltip title={`${RESOLUTION_LABELS[resolution]} · ${item.width}×${item.height}`}>
            <div
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: 10.5,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {resolution}
            </div>
          </Tooltip>
        )}

        {/* Approved badge */}
        {item.approved && (
          <div style={{ position: 'absolute', top: 6, left: 8 }}>
            <Tag color="success" style={{ fontSize: 11, margin: 0, padding: '0 5px' }}>
              {t('footage.approved')}
            </Tag>
          </div>
        )}
      </div>

      {/* Card body */}
      <div
        style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: '#111827',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.titleVi || item.name}
        </div>

        {/* Summary */}
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.summaryVi || item.summaryEn}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Orientation */}
          <Tooltip title={ORIENTATION_LABELS_VI[item.orientation]}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <OrientationIcon orientation={item.orientation} />
            </span>
          </Tooltip>

          {/* Genre */}
          {item.genre && (
            <Tag style={{ fontSize: 11, margin: 0, padding: '0 5px' }} color="blue">
              {item.genre}
            </Tag>
          )}

          {/* Quality */}
          {stars && (
            <span
              style={{ fontSize: 11, color: '#f59e0b', letterSpacing: 1 }}
              title={`${t('footage.quality')}: ${item.quality}`}
            >
              {stars}
            </span>
          )}
        </div>

        {/* Tags */}
        {topTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {topTags.map((tag) => (
              <Tag key={tag} style={{ fontSize: 11, margin: 0, padding: '0 5px' }}>
                {tag}
              </Tag>
            ))}
            {item.tags.length > 3 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
