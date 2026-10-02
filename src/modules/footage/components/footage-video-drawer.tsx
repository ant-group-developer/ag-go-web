import {
  Button,
  Col,
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
import { usePermissions } from '../../account/hooks/use-current-account';
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from '../../media/components/video-player/video-player';
import { AUTO_QUALITY } from '../../media/hooks/use-video-quality';
import { getProjectStatus } from '../../projects/utils/project-status.util';
import {
  actorName,
  formatMs,
  RESOLUTION_LABELS,
  resolutionOf,
  type FootageFileInfo,
  type FootageProject,
  type FootageVideo,
  type FootageVideoMedia,
} from '../api/footage';
import { footageSourceUrlQuery, useFootageVideoMedia } from '../hooks/use-footage';
import {
  FileInfoDescriptions,
  FootageDescription,
  InfoDescriptions,
  TagList,
} from './footage-description';

interface FootageVideoDrawerProps {
  open: boolean;
  item: FootageVideo | null;
  onClose: () => void;
}

// Wide enough for a large player beside the metadata tabs, but never edge-to-edge.
const DRAWER_WIDTH = 'min(1440px, 94vw)';
const QUALITY_STORAGE_KEY = 'ag-go.footage.videoQuality';

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

/** File name on its own line (long camera names never squeeze a table cell), then a stat strip. */
function FileSummary({ item }: { item: FootageVideo }) {
  const { t } = useTranslation();
  const resolution = item.width && item.height ? resolutionOf(item.width, item.height) : null;
  const stats: { label: string; value: ReactNode }[] = [
    { label: t('footage.duration'), value: formatMs(item.durationMs) },
    {
      label: t('footage.resolution'),
      value:
        item.width && item.height ? (
          <Space size={6} wrap>
            <span>
              {item.width} × {item.height}
            </span>
            {resolution && (
              <Tag style={{ marginInlineEnd: 0 }}>{RESOLUTION_LABELS[resolution]}</Tag>
            )}
          </Space>
        ) : (
          '-'
        ),
    },
    { label: t('footage.analyzedAt'), value: formatDate(item.analyzedAt) },
  ];
  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {t('footage.assetName')}
        </Typography.Text>
        <Typography.Text
          strong
          copyable={{ text: item.name }}
          ellipsis={{ tooltip: item.name }}
          style={{ maxWidth: '100%' }}
        >
          {item.name}
        </Typography.Text>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          padding: '10px 16px',
        }}
      >
        {stats.map((stat) => (
          <div key={stat.label} style={{ minWidth: 0 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {stat.label}
            </Typography.Text>
            <div style={{ fontWeight: 500 }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileTab({ file, item }: { file: FootageFileInfo | null; item: FootageVideo }) {
  if (!file) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <FileInfoDescriptions
      file={{ ...file, width: file.width ?? item.width, height: file.height ?? item.height }}
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

              {/* A lone keyframe adds nothing over the player itself. */}
              {media && media.keyframes.length > 1 ? (
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

              <FileSummary item={item} />
            </div>
          </Col>

          {/* Metadata */}
          <Col xs={24} lg={expanded ? 9 : 11}>
            <Tabs
              items={[
                {
                  key: 'description',
                  label: t('footage.tabDescription'),
                  children: <FootageDescription description={item} />,
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
