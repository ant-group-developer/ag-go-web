import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ExternalLink } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CAMERA_MOTION_LABELS_VI,
  formatMs,
  ORIENTATION_LABELS_VI,
  PEOPLE_COUNT_LABELS_VI,
  qualityStars,
  SETTING_LABELS_VI,
  SHOT_SIZE_LABELS_VI,
  TIME_OF_DAY_LABELS_VI,
  type FootageVideo,
} from '../api/footage';
import { useFootageVideoMedia } from '../hooks/use-footage';

interface FootageVideoDrawerProps {
  open: boolean;
  item: FootageVideo | null;
  /** Called when user wants to open the project review drawer for one of the video's projects. */
  onOpenProject?: (assetId: string) => void;
  onClose: () => void;
}

export function FootageVideoDrawer({
  open,
  item,
  onOpenProject,
  onClose,
}: FootageVideoDrawerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoMedia = useFootageVideoMedia(open && item ? item.assetId : null);

  const handleKeyframeClick = (tMs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = tMs / 1000;
      void videoRef.current.play().catch(() => undefined);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? item.titleVi || item.name : t('footage.drawerTitle')}
      width={680}
      styles={{ body: { padding: 0 } }}
      extra={
        item && onOpenProject ? (
          <Button
            size="small"
            icon={<ExternalLink size={14} />}
            onClick={() => onOpenProject(item.assetId)}
          >
            {t('footage.openProject')}
          </Button>
        ) : null
      }
    >
      {!item ? null : (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Video player */}
          {videoMedia.isPending ? (
            <Skeleton.Button active style={{ width: '100%', height: 300 }} />
          ) : videoMedia.data?.previewUrl ? (
            <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <video
                ref={videoRef}
                src={videoMedia.data.previewUrl}
                poster={videoMedia.data.posterUrl ?? undefined}
                controls
                preload="metadata"
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: 380,
                  objectFit: 'contain',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                background: '#1a1a1a',
                borderRadius: 8,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography.Text type="secondary">{t('footage.previewUnavailable')}</Typography.Text>
            </div>
          )}

          {/* Keyframe strip */}
          {videoMedia.data?.keyframes?.length ? (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.keyframes')}
              </Typography.Text>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {videoMedia.data.keyframes.map((kf) => (
                  <Tooltip key={kf.tMs} title={formatMs(kf.tMs)}>
                    <img
                      src={kf.url}
                      alt={formatMs(kf.tMs)}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleKeyframeClick(kf.tMs)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleKeyframeClick(kf.tMs);
                        }
                      }}
                      style={{
                        width: 120,
                        aspectRatio: '16/9',
                        objectFit: 'cover',
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'border-color 0.15s ease',
                      }}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : null}

          <Divider style={{ margin: 0 }} />

          {/* Description fields */}
          <Descriptions
            column={1}
            size="small"
            labelStyle={{ fontWeight: 600, color: '#374151', width: 160, flexShrink: 0 }}
          >
            <Descriptions.Item label={t('footage.assetName')}>{item.name}</Descriptions.Item>
            <Descriptions.Item label={t('footage.duration')}>
              {formatMs(item.durationMs)}
            </Descriptions.Item>

            {item.titleVi && (
              <Descriptions.Item label={t('footage.titleVi')}>{item.titleVi}</Descriptions.Item>
            )}
            {item.summaryVi && (
              <Descriptions.Item label={t('footage.summaryVi')}>{item.summaryVi}</Descriptions.Item>
            )}
            {item.summaryEn && (
              <Descriptions.Item label={t('footage.summaryEn')}>{item.summaryEn}</Descriptions.Item>
            )}
            {item.genre && (
              <Descriptions.Item label={t('footage.genre')}>
                <Tag color="blue">{item.genre}</Tag>
              </Descriptions.Item>
            )}
            {item.mood && (
              <Descriptions.Item label={t('footage.mood')}>{item.mood}</Descriptions.Item>
            )}
            {item.timeOfDay && (
              <Descriptions.Item label={t('footage.timeOfDay')}>
                {TIME_OF_DAY_LABELS_VI[item.timeOfDay]}
              </Descriptions.Item>
            )}
            {item.setting && (
              <Descriptions.Item label={t('footage.setting')}>
                {SETTING_LABELS_VI[item.setting]}
              </Descriptions.Item>
            )}
            {item.peopleCount && (
              <Descriptions.Item label={t('footage.peopleCount')}>
                {PEOPLE_COUNT_LABELS_VI[item.peopleCount]}
              </Descriptions.Item>
            )}
            {item.orientation && (
              <Descriptions.Item label={t('footage.orientation')}>
                {ORIENTATION_LABELS_VI[item.orientation]}
              </Descriptions.Item>
            )}
            {item.shotVariety.length > 0 && (
              <Descriptions.Item label={t('footage.shotVariety')}>
                <Space size={[4, 4]} wrap>
                  {item.shotVariety.map((s) => (
                    <Tag key={s}>{SHOT_SIZE_LABELS_VI[s]}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {item.cameraMotions.length > 0 && (
              <Descriptions.Item label={t('footage.cameraMotion')}>
                <Space size={[4, 4]} wrap>
                  {item.cameraMotions.map((cm) => (
                    <Tag key={cm}>{CAMERA_MOTION_LABELS_VI[cm]}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('footage.hasAudio')}>
              <Tag color={item.hasAudio ? 'success' : 'default'}>
                {item.hasAudio ? t('footage.yes') : t('footage.no')}
              </Tag>
              {item.hasSpeech !== null && (
                <Tag color={item.hasSpeech ? 'processing' : 'default'} style={{ marginLeft: 4 }}>
                  {item.hasSpeech ? t('footage.hasSpeech') : t('footage.noSpeech')}
                </Tag>
              )}
            </Descriptions.Item>
            {item.visibleText && (
              <Descriptions.Item label={t('footage.visibleText')}>
                {item.visibleText}
              </Descriptions.Item>
            )}
            {item.hasWatermark && (
              <Descriptions.Item label={t('footage.hasWatermark')}>
                <Tag color="warning">{t('footage.yes')}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('footage.quality')}>
              <span style={{ color: '#f59e0b' }}>{qualityStars(item.quality)}</span>
              <span style={{ color: '#6b7280', marginLeft: 6 }}>({item.quality}/5)</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('footage.usable')}>
              <Tag color={item.usable ? 'success' : 'default'}>
                {item.usable ? t('footage.usableYes') : t('footage.usableNo')}
              </Tag>
              {!item.usable && item.usableReason && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                  {item.usableReason}
                </Typography.Text>
              )}
            </Descriptions.Item>
            {item.approved && (
              <Descriptions.Item label={t('footage.approved')}>
                <Tag color="success">{t('footage.approvedYes')}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Topics */}
          {item.topics.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.topics')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.topics.map((s) => (
                  <Tag key={s} color="geekblue">
                    {s}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Subjects */}
          {item.subjects.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.subjects')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.subjects.map((s) => (
                  <Tag key={s} color="purple">
                    {s}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Places */}
          {item.places.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.places')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.places.map((p) => (
                  <Tag key={p} color="orange">
                    {p}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Actions */}
          {item.actions.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.actions')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.actions.map((a) => (
                  <Tag key={a} color="cyan">
                    {a}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.tags')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Keywords Vi */}
          {item.keywordsVi.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.keywordsVi')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.keywordsVi.map((kw) => (
                  <Tag key={kw} color="blue">
                    {kw}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Project names */}
          {item.projectNames.length > 0 && (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.projectNames')}
              </Typography.Text>
              <Space size={[4, 4]} wrap>
                {item.projectNames.map((name) => (
                  <Tag key={name} icon={<ExternalLink size={12} />}>
                    {name}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
