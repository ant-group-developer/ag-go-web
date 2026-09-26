import { FileImageOutlined, ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Flex,
  Input,
  Progress,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { RenderJob, RenderJobOutput } from '../api/render';
import { useRetryRenderJob } from '../hooks/use-render';
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

type StatusFilter = 'all' | 'active' | 'completed' | 'failed';

const ACTIVE_STATUSES = ['queued', 'processing'];

type RenderJobTableProps = {
  jobs: RenderJob[];
  loading?: boolean;
  error?: string;
  /** Shown above the filters, e.g. where the jobs come from. */
  hint?: string;
  /** Show what queued each job (upload, Drive import, batch...). */
  showSource?: boolean;
  /** Show when and by whom each job was queued. */
  showCreated?: boolean;
  /** Hide the project column, e.g. inside a project page. */
  hideProject?: boolean;
  /** Fixed body height; rows scroll inside the table. */
  scrollY?: number;
};

function OutputsTable({ outputs }: { outputs: RenderJobOutput[] }) {
  const { t } = useTranslation();
  const sorted = [...outputs].sort(
    (a, b) =>
      Number(isThumbnailOutput(a)) - Number(isThumbnailOutput(b)) ||
      (a.width ?? 0) - (b.width ?? 0),
  );
  return (
    <Table<RenderJobOutput>
      size="small"
      rowKey="variantCode"
      pagination={false}
      dataSource={sorted}
      locale={{ emptyText: t('render.noOutputs') }}
      columns={[
        {
          key: 'variant',
          title: t('render.variant'),
          render: (_, output) =>
            isThumbnailOutput(output)
              ? t('render.thumbnail')
              : t('render.previewSize', { width: output.width ?? '-' }),
        },
        {
          key: 'resolution',
          title: t('render.resolution'),
          render: (_, output) => formatResolution(output.width, output.height),
        },
        {
          key: 'size',
          title: t('render.fileSize'),
          render: (_, output) => formatFileSize(output.fileSizeBytes),
        },
        { key: 'format', title: t('render.format'), dataIndex: 'mimeType' },
        {
          key: 'watermark',
          title: t('render.watermark'),
          render: (_, output) =>
            output.hasWatermark ? (
              <Tag color="blue">{t('render.withWatermark')}</Tag>
            ) : (
              <Tag>{t('render.withoutWatermark')}</Tag>
            ),
        },
        {
          key: 'version',
          title: t('render.profileVersion'),
          render: (_, output) => `v${output.renderVersion}`,
        },
      ]}
    />
  );
}

/** One row per file with its original and rendered sizes, filterable by status and name. */
export function RenderJobTable({
  jobs,
  loading,
  error,
  hint,
  showSource,
  showCreated,
  hideProject,
  scrollY,
}: RenderJobTableProps) {
  const { t } = useTranslation();
  const retryJob = useRetryRenderJob();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filteredJobs = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return jobs.filter((job) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && ACTIVE_STATUSES.includes(job.status)) ||
        job.status === statusFilter;
      const matchesSearch =
        !keyword ||
        (job.asset?.originalFilename ?? job.assetId).toLocaleLowerCase('vi-VN').includes(keyword) ||
        (job.project?.name ?? '').toLocaleLowerCase('vi-VN').includes(keyword);
      return matchesStatus && matchesSearch;
    });
  }, [jobs, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: jobs.length,
      active: jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
    }),
    [jobs],
  );

  const columns: ColumnsType<RenderJob> = [
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

  return (
    <Flex vertical gap={16}>
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {retryJob.isError ? <Alert type="error" showIcon message={retryJob.error.message} /> : null}
      <Flex gap={12} wrap justify="space-between">
        <Segmented<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: `${t('render.filterAll')} (${counts.all})` },
            { value: 'active', label: `${t('render.status.processing')} (${counts.active})` },
            {
              value: 'completed',
              label: `${t('render.status.completed')} (${counts.completed})`,
            },
            { value: 'failed', label: `${t('render.status.failed')} (${counts.failed})` },
          ]}
        />
        <Input.Search
          allowClear
          placeholder={t('render.searchJobs')}
          style={{ maxWidth: 280 }}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Flex>
      <Table<RenderJob>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filteredJobs}
        scroll={{ x: 1260 + (showSource ? 120 : 0) + (showCreated ? 170 : 0), y: scrollY }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (job) => <OutputsTable outputs={job.outputs ?? []} />,
          rowExpandable: (job) => (job.outputs?.length ?? 0) > 0,
        }}
        locale={{ emptyText: t('render.noJobs') }}
      />
    </Flex>
  );
}
