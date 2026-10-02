import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { Folder as FolderIcon, Pause, Play, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import { formatDate } from '../../../shared/lib/format-date';
import { useFolders } from '../../folders/hooks/use-folders';
import type { Folder as FolderType } from '../../folders/types/folder.type';
import {
  analysisStatusColor,
  batchStatusColor,
  type AnalysisBatch,
  type AnalysisStatus,
  type BackfillMode,
  type BatchSortBy,
} from '../api/analysis';
import {
  useAnalysisBatches,
  useAnalysisStats,
  useBackfillAnalysis,
  useCancelBatch,
  usePauseBatch,
  useResumeBatch,
} from '../hooks/use-analysis';
import { AnalysisLogCard } from './analysis-log-card';

// ─── Folder tree helpers ─────────────────────────────────────────────────────

function buildSimpleFolderTree(folders: FolderType[]): DataNode[] {
  const nodeMap = new Map<string, DataNode>();
  for (const f of folders) {
    nodeMap.set(f.id, {
      key: f.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <FolderIcon size={14} style={{ color: '#1677ff', flexShrink: 0 }} />
          <span>{f.name}</span>
        </span>
      ),
      children: [],
    });
  }

  const roots: DataNode[] = [];
  for (const f of folders) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      (nodeMap.get(f.parentId)!.children as DataNode[]).push(node);
    } else {
      roots.push(node);
    }
  }

  function cleanEmptyChildren(nodes: DataNode[]): DataNode[] {
    return nodes.map((n) => ({
      ...n,
      children:
        n.children && (n.children as DataNode[]).length > 0
          ? cleanEmptyChildren(n.children as DataNode[])
          : undefined,
    }));
  }

  return cleanEmptyChildren(roots);
}

// ─── Status counts card ───────────────────────────────────────────────────────

const STATUS_ORDER: AnalysisStatus[] = [
  'queued',
  'extracting',
  'extracted',
  'describing',
  'paused',
  'completed',
  'failed',
  'cancelled',
];

function AnalysisStatsCard({ folderIds }: { folderIds?: string[] }) {
  const { t } = useTranslation();
  const stats = useAnalysisStats(folderIds);

  if (stats.isPending) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (stats.isError) {
    return (
      <Card>
        <Typography.Text type="danger">{stats.error.message}</Typography.Text>
      </Card>
    );
  }

  const counts = stats.data?.counts;
  const videos = stats.data?.videos;

  return (
    <Card title={t('analysis.statsTitle')}>
      <Row gutter={[16, 12]}>
        <Col span={24}>
          <Space size={[6, 6]} wrap>
            <Tag color="default">
              {t('analysis.statusNone')}: {counts?.none ?? 0}
            </Tag>
            {STATUS_ORDER.map((status) => (
              <Tag key={status} color={analysisStatusColor(status)}>
                {t(`analysis.status.${status}`)}: {counts?.[status] ?? 0}
              </Tag>
            ))}
          </Space>
        </Col>
        {videos ? (
          <>
            <Col xs={12} sm={8}>
              <Statistic
                title={t('analysis.videosAnalyzed')}
                value={videos.analyzed}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Statistic
                title={t('analysis.videosUsable')}
                value={videos.usable}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Col>
          </>
        ) : null}
      </Row>
    </Card>
  );
}

// ─── Batch management table ────────────────────────────────────────────────────

const BACKFILL_MODE_LABELS: Record<BackfillMode, string> = {
  missing: 'analysis.backfillModeMissing',
  outdated: 'analysis.backfillModeOutdated',
  all: 'analysis.backfillModeAll',
};

const BATCH_SORT_FIELDS: { value: BatchSortBy; labelKey: string }[] = [
  { value: 'createdAt', labelKey: 'analysis.batchCreatedAt' },
  { value: 'name', labelKey: 'analysis.batchName' },
  { value: 'status', labelKey: 'analysis.batchStatus' },
];

function AnalysisBatchesCard() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<BatchSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const batchesQuery = useAnalysisBatches({ page, pageSize: 20, sortBy, sortOrder });
  const pauseBatch = usePauseBatch();
  const resumeBatch = useResumeBatch();
  const cancelBatch = useCancelBatch();

  const handleAction = async (
    fn: (id: string) => Promise<unknown>,
    id: string,
    successKey: string,
  ) => {
    try {
      await fn(id);
      void message.success(t(successKey));
    } catch (err) {
      void message.error(err instanceof Error ? err.message : t('analysis.batchActionFailed'));
    }
  };

  const columns = [
    {
      key: 'name',
      title: t('analysis.batchName'),
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      key: 'kind',
      title: t('analysis.batchKind'),
      dataIndex: 'kind',
      width: 100,
      render: (v: AnalysisBatch['kind']) => <Tag>{t(`analysis.batchKinds.${v}`)}</Tag>,
    },
    {
      key: 'mode',
      title: t('analysis.batchMode'),
      dataIndex: 'mode',
      width: 150,
      render: (v: AnalysisBatch['mode']) => (v ? <Tag>{t(BACKFILL_MODE_LABELS[v])}</Tag> : '-'),
    },
    {
      key: 'progress',
      title: t('analysis.batchProgress'),
      width: 160,
      render: (_: unknown, row: AnalysisBatch) => {
        const total = row.counts.total;
        const done = row.counts.completed + row.counts.failed + row.counts.cancelled;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div style={{ minWidth: 120 }}>
            <Progress percent={pct} size="small" style={{ margin: 0 }} />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {done}/{total}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: t('analysis.batchStatus'),
      dataIndex: 'status',
      width: 120,
      render: (v: AnalysisBatch['status']) => (
        <Tag color={batchStatusColor(v)}>{t(`analysis.batchStatuses.${v}`)}</Tag>
      ),
    },
    {
      key: 'createdBy',
      title: t('analysis.batchCreatedBy'),
      dataIndex: 'createdBy',
      width: 180,
      ellipsis: true,
      render: (_: unknown, row: AnalysisBatch) => {
        if (!row.createdBy) {
          return t('analysis.batchCreatedBySystem');
        }
        const user = row.createdByUser;
        return (
          <Tooltip title={user?.email ?? row.createdBy}>
            <span>{user?.name || user?.email || row.createdBy}</span>
          </Tooltip>
        );
      },
    },
    {
      key: 'createdAt',
      title: t('analysis.batchCreatedAt'),
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: 120,
      render: (_: unknown, row: AnalysisBatch) => (
        <Space size={4}>
          {row.status === 'running' ? (
            <Tooltip title={t('analysis.batchPause')}>
              <Button
                size="small"
                type="text"
                aria-label={t('analysis.batchPause')}
                icon={<Pause size={16} />}
                loading={pauseBatch.isPending && pauseBatch.variables === row.id}
                onClick={() =>
                  void handleAction(
                    (id) => pauseBatch.mutateAsync(id),
                    row.id,
                    'analysis.batchPauseSuccess',
                  )
                }
              />
            </Tooltip>
          ) : row.status === 'paused' ? (
            <Tooltip title={t('analysis.batchResume')}>
              <Button
                size="small"
                type="text"
                aria-label={t('analysis.batchResume')}
                icon={<Play size={16} />}
                loading={resumeBatch.isPending && resumeBatch.variables === row.id}
                onClick={() =>
                  void handleAction(
                    (id) => resumeBatch.mutateAsync(id),
                    row.id,
                    'analysis.batchResumeSuccess',
                  )
                }
              />
            </Tooltip>
          ) : null}
          {row.status !== 'completed' && row.status !== 'cancelled' ? (
            <Popconfirm
              title={t('analysis.batchCancelConfirm')}
              okText={t('analysis.batchCancel')}
              cancelText={t('common.cancel')}
              onConfirm={() =>
                void handleAction(
                  (id) => cancelBatch.mutateAsync(id),
                  row.id,
                  'analysis.batchCancelSuccess',
                )
              }
            >
              <Tooltip title={t('analysis.batchCancel')}>
                <Button
                  size="small"
                  type="text"
                  danger
                  aria-label={t('analysis.batchCancel')}
                  icon={<X size={16} />}
                  loading={cancelBatch.isPending && cancelBatch.variables === row.id}
                />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={t('analysis.batchesTitle')}
      extra={
        <SortDropdown
          fields={BATCH_SORT_FIELDS.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
          sortBy={sortBy}
          sortOrder={sortOrder}
          size="small"
          onChange={(change) => {
            if (change.sortBy !== undefined) setSortBy(change.sortBy);
            if (change.sortOrder !== undefined) setSortOrder(change.sortOrder);
            setPage(1);
          }}
        />
      }
    >
      <Table<AnalysisBatch>
        size="small"
        rowKey="id"
        loading={batchesQuery.isPending}
        dataSource={batchesQuery.data?.items ?? []}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: batchesQuery.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </Card>
  );
}

// ─── Backfill form ────────────────────────────────────────────────────────────

type BackfillFormValues = {
  name?: string;
  mode: BackfillMode;
  priority: number;
};

export function AnalysisPanel() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<BackfillFormValues>();
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const folders = useFolders();
  const backfill = useBackfillAnalysis();

  const folderTree = useMemo(() => buildSimpleFolderTree(folders.data ?? []), [folders.data]);

  const handleBackfill = async (dryRun: boolean) => {
    const values = await form.validateFields();
    const result = await backfill.mutateAsync({
      folderIds: selectedFolderIds.length > 0 ? selectedFolderIds : undefined,
      name: values.name?.trim() || undefined,
      mode: values.mode,
      priority: values.priority || undefined,
      dryRun,
    });

    if (dryRun) {
      void message.info(
        t('analysis.backfillDryRunResult', {
          matched: result.matched,
          enqueued: result.enqueued,
          skipped: result.skipped,
        }),
      );
    } else {
      void message.success(
        t('analysis.backfillResult', {
          matched: result.matched,
          enqueued: result.enqueued,
          skipped: result.skipped,
        }),
      );
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <AnalysisStatsCard folderIds={selectedFolderIds.length > 0 ? selectedFolderIds : undefined} />

      <Card title={t('analysis.backfillTitle')}>
        <Form form={form} layout="vertical" initialValues={{ mode: 'missing', priority: 0 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={10}>
              <Form.Item label={t('analysis.backfillFolders')}>
                {folders.isPending ? (
                  <Spin size="small" />
                ) : (
                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: 'auto',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    <Tree
                      checkable
                      selectable={false}
                      treeData={folderTree}
                      checkedKeys={selectedFolderIds}
                      onCheck={(checked) => {
                        const keys = Array.isArray(checked) ? checked : checked.checked;
                        setSelectedFolderIds(keys.map(String));
                      }}
                      style={{ background: 'transparent', fontSize: 13 }}
                    />
                  </div>
                )}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedFolderIds.length > 0
                    ? t('analysis.backfillFoldersSelected', { count: selectedFolderIds.length })
                    : t('analysis.backfillFoldersAll')}
                </Typography.Text>
              </Form.Item>
            </Col>

            <Col xs={24} lg={14}>
              <Form.Item name="name" label={t('analysis.backfillName')}>
                <Input placeholder={t('analysis.backfillNamePlaceholder')} maxLength={200} />
              </Form.Item>

              <Form.Item
                name="mode"
                label={t('analysis.backfillMode')}
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Space direction="vertical" size={4}>
                    <Radio value="missing">
                      <Tooltip title={t('analysis.backfillModeMissingHint')}>
                        {t('analysis.backfillModeMissing')}
                      </Tooltip>
                    </Radio>
                    <Radio value="outdated">
                      <Tooltip title={t('analysis.backfillModeOutdatedHint')}>
                        {t('analysis.backfillModeOutdated')}
                      </Tooltip>
                    </Radio>
                    <Radio value="all">
                      <Tooltip title={t('analysis.backfillModeAllHint')}>
                        {t('analysis.backfillModeAll')}
                      </Tooltip>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="priority" label={t('analysis.backfillPriority')}>
                <InputNumber min={0} max={100} style={{ width: 120 }} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button loading={backfill.isPending} onClick={() => void handleBackfill(true)}>
                    {t('analysis.backfillDryRun')}
                  </Button>
                  <Button
                    type="primary"
                    loading={backfill.isPending}
                    onClick={() => void handleBackfill(false)}
                  >
                    {t('analysis.backfillRun')}
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <AnalysisBatchesCard />

      <AnalysisLogCard />
    </Space>
  );
}
