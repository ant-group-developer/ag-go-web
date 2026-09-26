import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, List, Spin, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { formatDate } from '../../../shared/lib/format-date';
import { getProjectAudit } from '../api/audit';

export function AuditPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const query = useQuery({
    queryKey: ['audit', 'project', projectId],
    queryFn: () => getProjectAudit(projectId),
    enabled: Boolean(projectId),
  });

  return (
    <PageContainer title={t('audit.title')}>
      {query.isLoading ? <Spin /> : null}
      {query.isError ? <Alert type="error" message={t('audit.loadFailed')} /> : null}
      {query.data?.items.length ? (
        <List
          bordered
          dataSource={query.data.items}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Tag>{item.action}</Tag>}
                description={`${item.actorUser?.name ?? item.actorUser?.email ?? item.actorUserId} · ${formatDate(item.createdAt)}`}
              />
            </List.Item>
          )}
        />
      ) : !query.isLoading && !query.isError ? (
        <Empty description={t('audit.empty')} />
      ) : null}
      <Typography.Text type="secondary">{t('audit.scopeNote')}</Typography.Text>
    </PageContainer>
  );
}
