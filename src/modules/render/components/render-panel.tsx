import { SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Form, Input, Space, Tabs, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Select } from '../../../shared/components/select';
import type { RenderBatch } from '../api/render';
import { useAllRenderBatches, useCreateRenderBatch, useRenderProfiles } from '../hooks/use-render';
import { normalizeRenderSizes } from '../utils/render-sizes';
import { AutoRenderJobTable } from './auto-render-job-table';
import { RenderBatchTable } from './render-batch-table';
import { RenderJobsDrawer } from './render-jobs-drawer';

type FormValues = { projectId?: string; folderId?: string };
type HistoryTab = 'auto' | 'batches';

/** Render profile, batch creation and system-wide render history (the Render tab of the Log page). */
export function RenderPanel() {
  const { t } = useTranslation();
  const profiles = useRenderProfiles();
  const batches = useAllRenderBatches();
  const [historyTab, setHistoryTab] = useState<HistoryTab>('auto');
  const createBatch = useCreateRenderBatch();
  const [profileId, setProfileId] = useState<string>();
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [createdBatch, setCreatedBatch] = useState<RenderBatch>();
  // Prefer the polled list entry so the drawer summary stays live.
  const selectedBatch =
    batches.data?.find((batch) => batch.id === selectedBatchId) ??
    (createdBatch?.id === selectedBatchId ? createdBatch : undefined);
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
                {sizes.previewWidths.map((width) => (
                  <Tag key={width} style={{ marginInlineEnd: 0 }}>
                    {width}px
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

      <Card title={t('render.createBatch')} style={{ marginBottom: 16 }}>
        <Form<FormValues>
          layout="inline"
          onFinish={(values) => {
            void createBatch
              .mutateAsync({ ...values, ...(profileId ? { renderProfileId: profileId } : {}) })
              .then((batch) => {
                setCreatedBatch(batch);
                setSelectedBatchId(batch.id);
              });
          }}
        >
          <Form.Item name="projectId" label={t('render.projectId')}>
            <Input placeholder={t('render.projectIdPlaceholder')} />
          </Form.Item>
          <Form.Item name="folderId" label={t('render.folderId')}>
            <Input placeholder={t('render.folderIdPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('render.profile')}>
            <Select
              allowClear
              style={{ minWidth: 220 }}
              placeholder={t('render.defaultProfilePlaceholder')}
              value={profileId}
              onChange={setProfileId}
              options={profiles.data?.map((profile) => ({
                value: profile.id,
                label: `${profile.name} · v${profile.profileVersion}`,
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createBatch.isPending}>
            {t('render.submitBatch')}
          </Button>
        </Form>
        {createBatch.isError ? (
          <Alert
            type="error"
            showIcon
            message={createBatch.error.message}
            style={{ marginTop: 16 }}
          />
        ) : null}
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
                  hint={t('render.autoJobsHint')}
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
