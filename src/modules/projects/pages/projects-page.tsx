import { Alert, Button, Card, Empty, Table, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CreateProjectModal } from '../components/create-project-modal';
import { useProjects } from '../hooks/use-projects';
import type { Project } from '../types/project.type';

export function ProjectsPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useProjects();

  if (projects.isError) {
    return <Alert type="error" message={projects.error.message} />;
  }

  return (
    <>
      <Card
        loading={projects.isPending}
        title={<Typography.Title level={3}>{t('projects.title')}</Typography.Title>}
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            {t('projects.create', 'Tạo dự án')}
          </Button>
        }
      >
        {!projects.isPending && projects.data?.items.length === 0 ? (
          <Empty description={t('projects.empty')} />
        ) : (
          <Table<Project>
            rowKey="id"
            dataSource={projects.data?.items}
            pagination={false}
            columns={[
              {
                title: t('projects.name'),
                dataIndex: 'name',
                render: (name: string, project) => (
                  <Link to={`/projects/${project.id}/media`}>{name}</Link>
                ),
              },
              { title: t('projects.folder'), dataIndex: 'folderId' },
              { title: t('projects.evaluationStatus'), dataIndex: 'evaluationStatus' },
            ]}
          />
        )}
      </Card>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
