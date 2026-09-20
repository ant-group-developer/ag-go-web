import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Empty } from 'antd';
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
  const columns: ProColumns<Project>[] = [
    {
      title: t('projects.name'),
      dataIndex: 'name',
      width: 320,
      ellipsis: true,
      render: (_, project) => <Link to={`/projects/${project.id}/media`}>{project.name}</Link>,
    },
    { title: t('projects.folder'), dataIndex: 'folderId', width: 360, ellipsis: true },
    { title: t('projects.evaluationStatus'), dataIndex: 'evaluationStatus', width: 180 },
  ];

  if (projects.isError) {
    return (
      <PageContainer title={t('projects.title')}>
        <Alert type="error" message={projects.error.message} />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title={t('projects.title')}
        extra={[
          <Button
            key="create"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('projects.create')}
          </Button>,
        ]}
      >
        {!projects.isPending && projects.data?.items.length === 0 ? (
          <Empty description={t('projects.empty')} />
        ) : (
          <ProTable<Project>
            rowKey="id"
            dataSource={projects.data?.items}
            loading={projects.isFetching}
            request={async () => {
              const result = await projects.refetch();
              if (result.error) {
                throw result.error;
              }
              const data = result.data?.items ?? [];
              return { data, success: true, total: data.length };
            }}
            manualRequest
            search={false}
            options={{ reload: true, density: false, setting: false, fullScreen: false }}
            pagination={{
              showTotal: (total, range) =>
                t('common.paginationTotal', {
                  start: range[0],
                  end: range[1],
                  total,
                }),
            }}
            columns={columns}
            tableProps={{
              sticky: true,
              scroll: { x: 'max-content', y: 'calc(100vh - 280px)' },
            }}
          />
        )}
      </PageContainer>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
