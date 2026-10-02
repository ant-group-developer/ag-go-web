import type { DescriptionsProps } from 'antd';
import {
  Button,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  Row,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import { usePermissions } from '../../account/hooks/use-current-account';
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from '../../media/components/video-player/video-player';
import { AUTO_QUALITY } from '../../media/hooks/use-video-quality';
import { getProjectStatus } from '../../projects/utils/project-status.util';
import {
  CAMERA_MOTION_LABELS_VI,
  formatMs,
  ORIENTATION_LABELS_VI,
  PEOPLE_COUNT_LABELS_VI,
  qualityStars,
  RESOLUTION_LABELS,
  resolutionOf,
  SETTING_LABELS_VI,
  SHOT_SIZE_LABELS_VI,
  TIME_OF_DAY_LABELS_VI,
  type FootageActor,
  type FootageFileInfo,
  type FootageProject,
  type FootageVideo,
  type FootageVideoMedia,
} from '../api/footage';
import { footageSourceUrlQuery, useFootageVideoMedia } from '../hooks/use-footage';

interface FootageVideoDrawerProps {
  open: boolean;
  item: FootageVideo | null;
  onClose: () => void;
}

const DRAWER_WIDTH = 1120;
const QUALITY_STORAGE_KEY = 'ag-go.footage.videoQuality';

function actorName(actor: FootageActor | null, fallbackId: string): string {
  return actor?.name || actor?.email || fallbackId;
}

function formatBitrate(bps: number | null): string {
  if (!bps) return '-';
  return bps >= 1_000_000
    ? `${(bps / 1_000_000).toFixed(1)} Mbps`
    : `${Math.round(bps / 1000)} kbps`;
}

/** One row of an info table; falsy entries are skipped so optional rows read inline. */
type InfoRow = { label: string; value: ReactNode } | false | null | undefined | '' | 0;

/** The one look every block of the drawer uses: bordered, one column, same label width. */
function InfoDescriptions({
  rows,
  title,
  extra,
  column = 1,
}: {
  rows: InfoRow[];
  title?: ReactNode;
  extra?: ReactNode;
  column?: DescriptionsProps['column'];
}) {
  const items: DescriptionsProps['items'] = rows
    .filter((row): row is { label: string; value: ReactNode } => Boolean(row))
    .map((row) => ({ key: row.label, label: row.label, children: row.value }));
  return (
    <Descriptions
      bordered
      size="small"
      column={column}
      title={title}
      extra={extra}
      items={items}
      styles={{ label: { fontWeight: 600, color: '#374151', width: 160 } }}
    />
  );
}

function TagList({ values, color }: { values: string[]; color?: string }) {
  return (
    <Space size={[4, 4]} wrap>
      {values.map((value) => (
        <Tag key={value} color={color} style={{ marginInlineEnd: 0 }}>
          {value}
        </Tag>
      ))}
    </Space>
  );
}

/** Previews in the custom player (auto quality + manual choice), like the project detail view. */
function FootagePlayer({
  media,
  playerRef,
}: {
  media: FootageVideoMedia;
  playerRef: RefObject<VideoPlayerHandle | null>;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [media.assetId]);

  if (failed || media.variants.length === 0) {
    return (
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: 8,
          aspectRatio: '16/9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography.Text style={{ color: '#9ca3af' }}>
          {t('footage.previewUnavailable')}
        </Typography.Text>
      </div>
    );
  }
  return (
    <VideoPlayer
      ref={playerRef}
      assetId={media.assetId}
      variants={media.variants}
      qualityStorageKey={QUALITY_STORAGE_KEY}
      defaultQuality={AUTO_QUALITY}
      sourceUrlQuery={footageSourceUrlQuery}
      onError={() => setFailed(true)}
      style={{ borderRadius: 8, overflow: 'hidden' }}
    />
  );
}

function DescriptionTab({ item }: { item: FootageVideo }) {
  const { t } = useTranslation();
  const tagRow = (label: string, values: string[], color?: string): InfoRow =>
    values.length > 0 && { label, value: <TagList values={values} color={color} /> };
  return (
    <InfoDescriptions
      rows={[
        item.titleVi && { label: t('footage.titleVi'), value: item.titleVi },
        item.summaryVi && { label: t('footage.summaryVi'), value: item.summaryVi },
        item.summaryEn && { label: t('footage.summaryEn'), value: item.summaryEn },
        item.genre && { label: t('footage.genre'), value: <Tag color="blue">{item.genre}</Tag> },
        item.mood && { label: t('footage.mood'), value: item.mood },
        item.timeOfDay && {
          label: t('footage.timeOfDay'),
          value: TIME_OF_DAY_LABELS_VI[item.timeOfDay],
        },
        item.setting && { label: t('footage.setting'), value: SETTING_LABELS_VI[item.setting] },
        item.peopleCount && {
          label: t('footage.peopleCount'),
          value: PEOPLE_COUNT_LABELS_VI[item.peopleCount],
        },
        item.orientation && {
          label: t('footage.orientation'),
          value: ORIENTATION_LABELS_VI[item.orientation],
        },
        tagRow(
          t('footage.shotVariety'),
          item.shotVariety.map((s) => SHOT_SIZE_LABELS_VI[s]),
        ),
        tagRow(
          t('footage.cameraMotion'),
          item.cameraMotions.map((cm) => CAMERA_MOTION_LABELS_VI[cm]),
        ),
        {
          label: t('footage.hasAudio'),
          value: (
            <Space size={4} wrap>
              <Tag color={item.hasAudio ? 'success' : 'default'}>
                {item.hasAudio ? t('footage.yes') : t('footage.no')}
              </Tag>
              {item.hasSpeech !== null && (
                <Tag color={item.hasSpeech ? 'processing' : 'default'}>
                  {item.hasSpeech ? t('footage.hasSpeech') : t('footage.noSpeech')}
                </Tag>
              )}
            </Space>
          ),
        },
        item.visibleText && { label: t('footage.visibleText'), value: item.visibleText },
        item.hasWatermark && {
          label: t('footage.hasWatermark'),
          value: <Tag color="warning">{t('footage.yes')}</Tag>,
        },
        {
          label: t('footage.quality'),
          value: (
            <>
              <span style={{ color: '#f59e0b' }}>{qualityStars(item.quality)}</span>
              <span style={{ color: '#6b7280', marginLeft: 6 }}>({item.quality}/5)</span>
            </>
          ),
        },
        {
          label: t('footage.usable'),
          value: (
            <>
              <Tag color={item.usable ? 'success' : 'default'}>
                {item.usable ? t('footage.usableYes') : t('footage.usableNo')}
              </Tag>
              {!item.usable && item.usableReason && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {item.usableReason}
                </Typography.Text>
              )}
            </>
          ),
        },
        item.approved && {
          label: t('footage.approved'),
          value: <Tag color="success">{t('footage.approvedYes')}</Tag>,
        },
        tagRow(t('footage.topics'), item.topics, 'geekblue'),
        tagRow(t('footage.subjects'), item.subjects, 'purple'),
        tagRow(t('footage.places'), item.places, 'orange'),
        tagRow(t('footage.actions'), item.actions, 'cyan'),
        tagRow(t('footage.tags'), item.tags),
        tagRow(t('footage.keywordsVi'), item.keywordsVi, 'blue'),
      ]}
    />
  );
}

function FileTab({ file, item }: { file: FootageFileInfo | null; item: FootageVideo }) {
  const { t } = useTranslation();
  if (!file) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  const width = file.width ?? item.width;
  const height = file.height ?? item.height;
  const resolution = width && height ? resolutionOf(width, height) : null;
  const sourceLabels: Record<string, string> = {
    local: t('footage.sourceLocal'),
    google_drive: 'Google Drive',
  };
  return (
    <InfoDescriptions
      rows={[
        {
          label: t('footage.assetName'),
          value: <Typography.Text copyable>{file.filename}</Typography.Text>,
        },
        {
          label: t('footage.fileFormat'),
          value: [file.mimeType, file.format, file.extension && `.${file.extension}`]
            .filter(Boolean)
            .join(' · '),
        },
        { label: t('footage.fileSize'), value: formatFileSize(file.fileSizeBytes) },
        {
          label: t('footage.resolution'),
          value:
            width && height ? (
              <Space size={6} wrap>
                <span>
                  {width} × {height}
                </span>
                {resolution && <Tag>{RESOLUTION_LABELS[resolution]}</Tag>}
              </Space>
            ) : (
              '-'
            ),
        },
        {
          label: t('footage.duration'),
          value: file.durationMs !== null ? formatMs(file.durationMs) : '-',
        },
        {
          label: t('footage.frameRate'),
          value: file.frameRate ? `${Math.round(file.frameRate * 100) / 100} fps` : '-',
        },
        { label: t('footage.codec'), value: file.codec ?? '-' },
        { label: t('footage.bitrate'), value: formatBitrate(file.bitrateBps) },
        {
          label: t('footage.hasAudio'),
          value: file.hasAudio === null ? '-' : file.hasAudio ? t('footage.yes') : t('footage.no'),
        },
        { label: t('footage.source'), value: sourceLabels[file.sourceType] ?? file.sourceType },
        { label: t('footage.uploadedAt'), value: formatDate(file.uploadedAt) },
        {
          label: t('footage.uploadedBy'),
          value: actorName(file.uploadedByUser, file.uploadedBy),
        },
        { label: t('footage.analyzedAt'), value: formatDate(file.analyzedAt) },
        file.analysisModel && { label: t('footage.analysisModel'), value: file.analysisModel },
      ]}
    />
  );
}

function ProjectInfo({ project, canOpen }: { project: FootageProject; canOpen: boolean }) {
  const { t } = useTranslation();
  const status = getProjectStatus(project.evaluationStatus);
  const mediaStatus = {
    pending: { color: 'processing', label: t('projects.evaluationPending') },
    approved: { color: 'success', label: t('projects.evaluationApproved') },
    rejected: { color: 'error', label: t('projects.evaluationRejected') },
  }[project.mediaEvaluationStatus];
  const location = [project.provinceName, project.countryName].filter(Boolean).join(', ');
  return (
    <InfoDescriptions
      title={
        canOpen ? (
          <Link to={`/projects/${project.id}`} style={{ display: 'inline-flex', gap: 6 }}>
            <span>{project.name}</span>
            <ExternalLink size={14} style={{ marginTop: 4, flexShrink: 0 }} />
          </Link>
        ) : (
          project.name
        )
      }
      extra={<Tag color={status.color}>{t(status.label)}</Tag>}
      rows={[
        {
          label: t('footage.projectAuthor'),
          value: actorName(project.ownerUser, project.ownerUserId),
        },
        { label: t('footage.filterFolder'), value: project.folderPath || '-' },
        { label: t('footage.filterCategory'), value: project.categoryName ?? '-' },
        { label: t('projects.location'), value: location || '-' },
        project.tags.length > 0 && {
          label: t('projects.tags'),
          value: <TagList values={project.tags} />,
        },
        mediaStatus && {
          label: t('footage.mediaEvaluation'),
          value: <Tag color={mediaStatus.color}>{mediaStatus.label}</Tag>,
        },
        { label: t('projects.createdAt'), value: formatDate(project.createdAt) },
        { label: t('projects.updatedAt'), value: formatDate(project.updatedAt) },
        project.description && {
          label: t('footage.projectDescription'),
          value: (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              ellipsis={{ rows: 3, expandable: true, symbol: t('footage.showMore') }}
            >
              {project.description}
            </Typography.Paragraph>
          ),
        },
      ]}
    />
  );
}

export function FootageVideoDrawer({ open, item, onClose }: FootageVideoDrawerProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const screens = Grid.useBreakpoint();
  const [expanded, setExpanded] = useState(false);
  const playerRef = useRef<VideoPlayerHandle>(null);

  const videoMedia = useFootageVideoMedia(open && item ? item.assetId : null);
  const media = videoMedia.data?.assetId === item?.assetId ? videoMedia.data : undefined;
  const canOpenProject = can(GO_PERMISSIONS.PROJECT_READ);

  const handleKeyframeClick = (tMs: number) => {
    playerRef.current?.seekTo(tMs / 1000);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? item.titleVi || item.name : t('footage.drawerTitle')}
      width={expanded || !screens.lg ? '100%' : DRAWER_WIDTH}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
      extra={
        screens.lg ? (
          <Tooltip title={expanded ? t('footage.collapseDrawer') : t('footage.expandDrawer')}>
            <Button
              type="text"
              icon={expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? t('footage.collapseDrawer') : t('footage.expandDrawer')}
            />
          </Tooltip>
        ) : null
      }
    >
      {!item ? null : (
        <Row gutter={[24, 20]} style={{ padding: 24, margin: 0 }}>
          {/* Player, keyframes */}
          <Col xs={24} lg={expanded ? 15 : 13}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!media ? (
                <Skeleton.Button active block style={{ height: 320 }} />
              ) : (
                <FootagePlayer media={media} playerRef={playerRef} />
              )}

              {media?.keyframes.length ? (
                <div>
                  <Typography.Text
                    strong
                    style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
                  >
                    {t('footage.keyframes')}
                  </Typography.Text>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {media.keyframes.map((kf) => (
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
                            width: 112,
                            aspectRatio: '16/9',
                            objectFit: 'cover',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        />
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ) : null}

              <InfoDescriptions
                column={{ xs: 1, sm: 2 }}
                rows={[
                  { label: t('footage.assetName'), value: item.name },
                  { label: t('footage.duration'), value: formatMs(item.durationMs) },
                  {
                    label: t('footage.resolution'),
                    value: item.width && item.height ? `${item.width} × ${item.height}` : '-',
                  },
                  { label: t('footage.analyzedAt'), value: formatDate(item.analyzedAt) },
                ]}
              />
            </div>
          </Col>

          {/* Metadata */}
          <Col xs={24} lg={expanded ? 9 : 11}>
            <Tabs
              items={[
                {
                  key: 'description',
                  label: t('footage.tabDescription'),
                  children: <DescriptionTab item={item} />,
                },
                {
                  key: 'file',
                  label: t('footage.tabFile'),
                  children: media ? <FileTab file={media.file} item={item} /> : <Skeleton active />,
                },
                {
                  key: 'projects',
                  label: t('footage.tabProjects', {
                    count: media?.projects.length ?? item.projectIds.length,
                  }),
                  children: media ? (
                    media.projects.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {media.projects.map((project) => (
                          <ProjectInfo
                            key={project.id}
                            project={project}
                            canOpen={canOpenProject}
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )
                  ) : (
                    <Skeleton active />
                  ),
                },
              ]}
            />
          </Col>
        </Row>
      )}
    </Drawer>
  );
}
