import { SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Space, Tabs, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAllRenderBatches, useRenderProfiles } from '../hooks/use-render';
import { normalizeRenderSizes, sortVariantsDesc } from '../utils/render-sizes';
import { AutoRenderJobTable } from './auto-render-job-table';
import { RenderBatchTable } from './render-batch-table';
import { RenderJobsDrawer } from './render-jobs-drawer';

type HistoryTab = 'auto' | 'batches';

/** Render profile and system-wide render history (the Render tab of the Log page). */
export function RenderPanel() {
  const { t } = useTranslation();
  const profiles = useRenderProfiles();
  const batches = useAllRenderBatches();
  const [historyTab, setHistoryTab] = useState<HistoryTab>('auto');
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId);
  const activeProfile = profiles.data?.[0];
  const sizes = activeProfile ? normalizeRenderSizes(activeProfile.renderSizes) : undefined;

  return (
    <>
      {profiles.isError ? (
        <Alert type="error" showIcon message={t('render.loadProfilesFailed')} />
      ) : null}
      <Card
        title={t('render.defaultProfile')}
        loading={profiles.isLoading}
        extra={
          <Link to="/system/settings">
            <Button size="small" icon={<SettingOutlined />}>
              {t('render.editProfile')}
            </Button>
          </Link>
        }
        style={{ marginBottom: 16 }}
      >
        {activeProfile && sizes ? (
          <Descriptions size="small" column={{ xs: 1, md: 2, xl: 4 }}>
            <Descriptions.Item label={t('render.profile')}>
              {activeProfile.name} · v{activeProfile.profileVersion}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.watermark')}>
              {activeProfile.watermarkEnabled ? (
                <Tag color="blue">{t('render.withWatermark')}</Tag>
              ) : (
                <Tag>{t('render.withoutWatermark')}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('render.previewSizes')}>
              <Space size={[4, 4]} wrap>
                {sortVariantsDesc(sizes.variants).map((variant) => (
                  <Tag
                    key={`${variant.resolution}-${variant.watermark}`}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {t(
                      variant.watermark
                        ? 'render.variantWithWatermark'
                        : 'render.variantWithoutWatermark',
                      { resolution: variant.resolution },
                    )}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('render.thumbnail')}>
              {sizes.thumbnailWidth}px
            </Descriptions.Item>
          </Descriptions>
        ) : (
          t('render.noProfiles')
        )}
      </Card>

      <Card title={t('render.systemHistory')}>
        <Tabs
          activeKey={historyTab}
          onChange={(key) => setHistoryTab(key as HistoryTab)}
          items={[
            {
              key: 'auto',
              label: t('render.autoJobsTab'),
              children: (
                <AutoRenderJobTable
                  enabled={historyTab === 'auto'}
                  // hint={t('render.autoJobsHint')}
                />
              ),
            },
            {
              key: 'batches',
              label: t('render.batchesTab'),
              children: (
                <>
                  {batches.isError ? (
                    <Alert
                      type="error"
                      showIcon
                      message={batches.error.message}
                      style={{ marginBottom: 16 }}
                    />
                  ) : null}
                  <RenderBatchTable
                    batches={batches.data ?? []}
                    loading={batches.isLoading}
                    onRefresh={() => void batches.refetch()}
                    refreshing={batches.isFetching}
                    onViewJobs={(batch) => setSelectedBatchId(batch.id)}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <RenderJobsDrawer
        batch={selectedBatch}
        open={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId(undefined)}
      />
    </>
  );
}
