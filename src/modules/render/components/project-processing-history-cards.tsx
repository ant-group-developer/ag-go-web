import { Alert, Button, Card, Select, Space } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImportBatchDrawer } from '../../google-drive/components/import-batch-drawer';
import { ImportBatchTable } from '../../google-drive/components/import-batch-table';
import { useProjectImports } from '../../google-drive/hooks/use-google-drive';
import {
  useAutoRenderJobs,
  useCreateRenderBatch,
  useProjectRenderBatches,
  useRenderProfiles,
} from '../hooks/use-render';
import { RenderBatchTable } from './render-batch-table';
import { RenderJobTable } from './render-job-table';
import { RenderJobsDrawer } from './render-jobs-drawer';

type ProjectHistoryCardProps = {
  projectId: string;
  /** DOM id used as an anchor target. */
  id?: string;
  scrollY?: number;
};

export function ProjectImportHistoryCard({ projectId, id, scrollY }: ProjectHistoryCardProps) {
  const { t } = useTranslation();
  const imports = useProjectImports(projectId);
  const [selectedImportId, setSelectedImportId] = useState('');

  return (
    <Card id={id} title={t('render.importFilesTitle')}>
      {imports.isError ? (
        <Alert type="error" showIcon message={imports.error.message} style={{ marginBottom: 16 }} />
      ) : null}
      <ImportBatchTable
        batches={imports.data ?? []}
        loading={imports.isLoading}
        scrollY={scrollY}
        onViewItems={(batch) => setSelectedImportId(batch.id)}
      />
      <ImportBatchDrawer
        batch={imports.data?.find((batch) => batch.id === selectedImportId)}
        open={Boolean(selectedImportId)}
        onClose={() => setSelectedImportId('')}
      />
    </Card>
  );
}

export function ProjectAutoRenderJobsCard({ projectId, id, scrollY }: ProjectHistoryCardProps) {
  const { t } = useTranslation();
  const autoJobs = useAutoRenderJobs(projectId, Boolean(projectId));

  return (
    <Card id={id} title={t('render.autoJobsTab')}>
      <RenderJobTable
        jobs={autoJobs.data ?? []}
        loading={autoJobs.isLoading}
        error={autoJobs.isError ? autoJobs.error.message : undefined}
        showSource
        showCreated
        hideProject
        scrollY={scrollY}
      />
    </Card>
  );
}

export function ProjectRenderBatchesCard({ projectId, id, scrollY }: ProjectHistoryCardProps) {
  const { t } = useTranslation();
  const renderBatches = useProjectRenderBatches(projectId);
  const profiles = useRenderProfiles();
  const createBatch = useCreateRenderBatch();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [profileId, setProfileId] = useState<string>();

  return (
    <Card id={id} title={t('render.batchesTab')}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          style={{ minWidth: 240 }}
          placeholder={t('render.renderProfilePlaceholder')}
          value={profileId}
          onChange={setProfileId}
          options={profiles.data?.map((profile) => ({
            value: profile.id,
            label: `${profile.name} · v${profile.profileVersion}`,
          }))}
        />
        <Button
          type="primary"
          loading={createBatch.isPending}
          disabled={!profiles.data?.length}
          onClick={() =>
            createBatch.mutate({
              projectId,
              ...(profileId ? { renderProfileId: profileId } : {}),
            })
          }
        >
          {t('render.renderAllProject')}
        </Button>
      </Space>

      {renderBatches.isError ? (
        <Alert
          type="error"
          showIcon
          message={renderBatches.error.message}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <RenderBatchTable
        batches={renderBatches.data ?? []}
        loading={renderBatches.isLoading}
        hideScope
        scrollY={scrollY}
        onViewJobs={(batch) => setSelectedBatchId(batch.id)}
      />
      <RenderJobsDrawer
        batch={renderBatches.data?.find((batch) => batch.id === selectedBatchId)}
        open={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId('')}
      />
    </Card>
  );
}
