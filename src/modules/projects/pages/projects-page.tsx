import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getProjects, type Project } from '../api/projects';

export function ProjectsPage() {
  const { t } = useTranslation();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  if (projects.isError) {
    return <Alert type="error" message={projects.error.message} />;
  }

  return (
    <Card loading={projects.isPending}>
      <Typography.Title level={3}>{t('projects.title')}</Typography.Title>
      {!projects.isPending && projects.data?.items.length === 0 ? (
        <Empty description={t('projects.empty')} />
      ) : (
        <Table<Project>
          rowKey="id"
          dataSource={projects.data?.items}
          pagination={false}
          columns={[
            { title: t('projects.name'), dataIndex: 'name' },
            { title: t('projects.folder'), dataIndex: 'folderId' },
            { title: t('projects.evaluationStatus'), dataIndex: 'evaluationStatus' },
          ]}
        />
      )}
    </Card>
  );
}
