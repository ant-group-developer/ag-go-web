import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { RenderBatch } from '../api/render';

/** What a batch covers: its project, several projects, or a folder. */
export function RenderBatchScope({ batch }: { batch: RenderBatch }) {
  const { t } = useTranslation();
  const projectCount = batch.projectCount ?? 0;
  const projectName = batch.projectName ?? null;

  const label =
    batch.projectId && projectName
      ? projectName
      : projectCount > 1
        ? t('render.multipleProjects', { name: projectName, count: projectCount - 1 })
        : (projectName ?? '-');

  const project =
    batch.projectId && projectName ? (
      <Link to={`/projects/${batch.projectId}`} style={{ minWidth: 0 }}>
        <Typography.Text ellipsis={{ tooltip: label }} style={{ color: 'inherit' }}>
          {label}
        </Typography.Text>
      </Link>
    ) : (
      <Typography.Text ellipsis={{ tooltip: label }}>{label}</Typography.Text>
    );

  return (
    <Flex vertical style={{ minWidth: 0 }}>
      {project}
      {batch.folderPath ? (
        <Typography.Text
          type="secondary"
          ellipsis={{ tooltip: batch.folderPath }}
          style={{ fontSize: 12 }}
        >
          {batch.folderPath}
        </Typography.Text>
      ) : null}
    </Flex>
  );
}
