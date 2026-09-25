import { Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { RenderBatch } from '../api/render';

/** What a batch covers: its project, several projects, or a folder. */
export function RenderBatchScope({ batch }: { batch: RenderBatch }) {
  const { t } = useTranslation();
  const projectCount = batch.projectCount ?? 0;
  const projectName = batch.projectName ?? null;

  const project =
    batch.projectId && projectName ? (
      <Link to={`/projects/${batch.projectId}`}>{projectName}</Link>
    ) : projectCount > 1 ? (
      <Typography.Text>
        {t('render.multipleProjects', { name: projectName, count: projectCount - 1 })}
      </Typography.Text>
    ) : (
      <Typography.Text>{projectName ?? '-'}</Typography.Text>
    );

  return (
    <Space direction="vertical" size={0}>
      {project}
      {batch.folderPath ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {batch.folderPath}
        </Typography.Text>
      ) : null}
    </Space>
  );
}
