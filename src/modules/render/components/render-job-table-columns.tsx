import { FileImageOutlined, ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Button, Progress, Space, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { RenderJob } from '../api/render';
import type { useRetryRenderJob } from '../hooks/use-render';
import {
  formatElapsed,
  formatResolution,
  isThumbnailOutput,
  previewOutputs,
  RENDER_JOB_SOURCE_COLORS,
  RENDER_STATUS_COLORS,
  renderJobSourceLabel,
  renderStatusLabel,
  totalOutputBytes,
} from '../utils/render-format';

/** Processing timestamps include seconds so short jobs are distinguishable. */
const PROCESSED_AT_FORMAT = 'HH:mm:ss DD/MM/YYYY';

/** Base scroll width of the columns that are always shown. */
export const RENDER_JOB_BASE_SCROLL_X = 1470;

type RenderJobColumnOptions = {
  t: TFunction;
  retryJob: ReturnType<typeof useRetryRenderJob>;
  showSource?: boolean;
  showCreated?: boolean;
  hideProject?: boolean;
};

/** Columns of the render job table: one row per file with its original and rendered outputs. */
export function buildRenderJobColumns({
  t,
  retryJob,
  showSource,
  showCreated,
  hideProject,
}: RenderJobColumnOptions): ColumnsType<RenderJob> {
  return [
    {
      key: 'file',
      title: t('render.file'),
      width: 260,
      fixed: 'left',
      render: (_, job) => (
        <Space align="start">
          {job.asset?.assetType === 'video' ? (
            <VideoCameraOutlined style={{ color: '#722ed1', marginTop: 4 }} />
          ) : (
            <FileImageOutlined style={{ color: '#1677ff', marginTop: 4 }} />
          )}
          <Typography.Text
            strong
            ellipsis={{ tooltip: job.asset?.originalFilename ?? job.assetId }}
            style={{ maxWidth: 220 }}
          >
            {job.asset?.originalFilename ?? job.assetId}
          </Typography.Text>
        </Space>
      ),
    },
    ...(showCreated
      ? [
          {
            key: 'createdAt',
            title: t('render.createdAt'),
            width: 170,
            render: (_: unknown, job: RenderJob) => (
              <Space direction="vertical" size={0}>
                <Typography.Text>{formatDate(job.createdAt)}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {job.createdByUser?.name ?? job.createdByUser?.email ?? '-'}
                </Typography.Text>
              </Space>
            ),
          },
        ]
      : []),
    ...(showSource
      ? [
          {
            key: 'source',
            title: t('render.sourceColumn'),
            width: 120,
            render: (_: unknown, job: RenderJob) =>
              job.source ? (
                <Tag color={RENDER_JOB_SOURCE_COLORS[job.source]}>
                  {renderJobSourceLabel(job.source, t)}
                </Tag>
              ) : (
                '-'
              ),
          },
        ]
      : []),
    ...(hideProject
      ? []
      : [
          {
            key: 'project',
            title: t('render.project'),
            width: 180,
            render: (_: unknown, job: RenderJob) =>
              job.project ? (
                <Link to={`/projects/${job.project.id}`}>
                  <Typography.Text
                    ellipsis={{ tooltip: job.project.name }}
                    style={{ maxWidth: 170 }}
                  >
                    {job.project.name}
                  </Typography.Text>
                </Link>
              ) : (
                '-'
              ),
          },
        ]),
    {
      key: 'status',
      title: t('render.statusColumn'),
      width: 200,
      render: (_, job) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Tag color={RENDER_STATUS_COLORS[job.status]}>{renderStatusLabel(job.status, t)}</Tag>
          {job.status === 'processing' ? (
            <Progress percent={job.progressPercent} size="small" />
          ) : null}
          {job.status === 'failed' && job.errorMessage ? (
            <Typography.Text type="danger" ellipsis={{ tooltip: job.errorMessage }}>
              {job.errorMessage}
            </Typography.Text>
          ) : job.status === 'processing' && job.progressMessage ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {job.progressMessage}
            </Typography.Text>
          ) : job.status === 'cancelled' && job.progressMessage?.includes('superseded') ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('render.supersededJob')}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      key: 'original',
      title: t('render.original'),
      width: 150,
      render: (_, job) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatResolution(job.asset?.width, job.asset?.height)}</Typography.Text>
          <Typography.Text type="secondary">
            {formatFileSize(job.asset?.fileSizeBytes)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      key: 'rendered',
      title: t('render.rendered'),
      width: 260,
      render: (_, job) => {
        const previews = previewOutputs(job);
        const thumbnail = job.outputs?.find(isThumbnailOutput);
        if (previews.length === 0 && !thumbnail) {
          return '-';
        }
        return (
          <Space direction="vertical" size={2}>
            <Space size={[4, 4]} wrap>
              {previews.map((output) => (
                <Tooltip
                  key={output.variantCode}
                  title={`${formatFileSize(output.fileSizeBytes)} · ${output.mimeType}`}
                >
                  <Tag
                    color={output.hasWatermark ? 'blue' : 'default'}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {formatResolution(output.width, output.height)}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('render.renderedSummary', {
                size: formatFileSize(totalOutputBytes(job)),
                thumbnail: thumbnail ? formatResolution(thumbnail.width, thumbnail.height) : '-',
              })}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      key: 'elapsed',
      title: t('render.elapsed'),
      width: 120,
      render: (_, job) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatElapsed(job.startedAt, job.finishedAt)}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('render.attempt', { count: job.attemptCount })}
          </Typography.Text>
        </Space>
      ),
    },
    {
      key: 'processedAt',
      title: t('render.processedAt'),
      width: 210,
      render: (_, job) => (
        <Space direction="vertical" size={0}>
          <Typography.Text style={{ fontSize: 12 }}>
            {t('render.jobStartedAt', { time: formatDate(job.startedAt, PROCESSED_AT_FORMAT) })}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('render.jobFinishedAt', { time: formatDate(job.finishedAt, PROCESSED_AT_FORMAT) })}
          </Typography.Text>
        </Space>
      ),
    },
    {
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, job) =>
        job.status === 'failed' ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={retryJob.isPending && retryJob.variables === job.id}
            onClick={() => retryJob.mutate(job.id)}
          >
            {t('common.retry')}
          </Button>
        ) : null,
    },
  ];
}
