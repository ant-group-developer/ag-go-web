import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Image,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CAMERA_MOTION_LABELS_VI,
  formatRange,
  ORIENTATION_LABELS_VI,
  PEOPLE_COUNT_LABELS_VI,
  qualityStars,
  SETTING_LABELS_VI,
  SHOT_SIZE_LABELS_VI,
  TIME_OF_DAY_LABELS_VI,
  type FootageItem,
} from '../api/footage';
import { useFootageSegmentMedia } from '../hooks/use-footage';
import { RangePlayer } from './range-player';

interface FootageSegmentDrawerProps {
  open: boolean;
  item: FootageItem | null;
  /** Called when user wants to open the project review drawer for the asset's project. */
  onOpenProject?: (assetId: string) => void;
  onClose: () => void;
}

export function FootageSegmentDrawer({
  open,
  item,
  onOpenProject,
  onClose,
}: FootageSegmentDrawerProps) {
  const { t } = useTranslation();

  const segmentMedia = useFootageSegmentMedia(open && item ? item.segmentId : null);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? (item.captionVi ?? item.captionEn ?? item.assetName) : t('footage.drawerTitle')}
      width={640}
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
          {/* Player */}
          {segmentMedia.isPending ? (
            <Skeleton.Button active style={{ width: '100%', height: 300 }} />
          ) : segmentMedia.data?.previewUrl ? (
            <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <RangePlayer
                src={segmentMedia.data.previewUrl}
                startMs={item.startMs}
                endMs={item.endMs}
                controls
                maxHeight={380}
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

          {/* Keyframes */}
          {segmentMedia.data?.keyframeUrls?.length ? (
            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                {t('footage.keyframes')}
              </Typography.Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {segmentMedia.data.keyframeUrls.map((url, i) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`keyframe-${i + 1}`}
                    width={140}
                    style={{ borderRadius: 6, objectFit: 'cover', aspectRatio: '16/9' }}
                    preview
                  />
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
            <Descriptions.Item label={t('footage.assetName')}>{item.assetName}</Descriptions.Item>
            <Descriptions.Item label={t('footage.timeRange')}>
              {formatRange(item.startMs, item.endMs)}
            </Descriptions.Item>

            {item.captionVi && (
              <Descriptions.Item label={t('footage.captionVi')}>{item.captionVi}</Descriptions.Item>
            )}
            {item.captionEn && (
              <Descriptions.Item label={t('footage.captionEn')}>{item.captionEn}</Descriptions.Item>
            )}

            {item.shotSize && (
              <Descriptions.Item label={t('footage.shotSize')}>
                {SHOT_SIZE_LABELS_VI[item.shotSize]}
              </Descriptions.Item>
            )}
            {item.cameraMotion && (
              <Descriptions.Item label={t('footage.cameraMotion')}>
                {CAMERA_MOTION_LABELS_VI[item.cameraMotion]}
              </Descriptions.Item>
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
            {item.quality !== null && (
              <Descriptions.Item label={t('footage.quality')}>
                <span style={{ color: '#f59e0b' }}>{qualityStars(item.quality)}</span>
                <span style={{ color: '#6b7280', marginLeft: 6 }}>({item.quality}/5)</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('footage.usable')}>
              <Tag color={item.usable ? 'success' : 'default'}>
                {item.usable ? t('footage.usableYes') : t('footage.usableNo')}
              </Tag>
            </Descriptions.Item>
            {item.approved && (
              <Descriptions.Item label={t('footage.approved')}>
                <Tag color="success">{t('footage.approvedYes')}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

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
