import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { Folder as FolderIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFolders } from '../../folders/hooks/use-folders';
import type { Folder as FolderType } from '../../folders/types/folder.type';
import { analysisStatusColor, type AnalysisStatus, type BackfillMode } from '../api/analysis';
import { useAnalysisStats, useBackfillAnalysis } from '../hooks/use-analysis';
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
  const segments = stats.data?.segments;

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
        {segments ? (
          <>
            <Col xs={12} sm={8}>
              <Statistic
                title={t('analysis.segmentsTotal')}
                value={segments.total}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Statistic
                title={t('analysis.segmentsUsable')}
                value={segments.usable}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Col>
          </>
        ) : null}
      </Row>
    </Card>
  );
}

// ─── Backfill form ────────────────────────────────────────────────────────────

type BackfillFormValues = {
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

      <AnalysisLogCard />
    </Space>
  );
}
