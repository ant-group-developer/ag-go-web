import { HistoryOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Skeleton, Space, Tag, Timeline, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { getProjectAudit } from '../../audit/api/audit';
import { getAuditActionStyle } from './project-audit-action-styles';
import { AuditLogEntry } from './project-audit-log-entry';

/** Chronological activity timeline of a project (create / update / uploads / Drive import). */
export function ProjectAuditLogCard({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const audit = useQuery({
    queryKey: ['audit', 'project', projectId],
    queryFn: () => getProjectAudit(projectId),
    enabled: enabled && Boolean(projectId),
  });
  const items = audit.data?.items ?? [];

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          <HistoryOutlined style={{ color: token.colorPrimary }} />
          {t('projects.auditLog')}
          {audit.data ? (
            <Tag bordered={false} style={{ marginInlineEnd: 0 }}>
              {t('projects.auditLogCount', { count: audit.data.total ?? items.length })}
            </Tag>
          ) : null}
        </Space>
      }
      style={{ marginTop: 16 }}
      styles={{ body: { padding: '16px 20px', maxHeight: 420, overflowY: 'auto' } }}
    >
      {audit.isError ? (
        <Alert type="error" showIcon message={t('projects.auditLogError')} />
      ) : audit.isPending ? (
        <Skeleton active avatar={{ size: 'small' }} paragraph={{ rows: 2 }} />
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('projects.auditLogEmpty')} />
      ) : (
        <Timeline
          style={{ marginBottom: -20, paddingTop: 4 }}
          items={items.map((item) => {
            const style = getAuditActionStyle(item.action);
            return {
              key: item.id,
              color: token[style.color],
              dot: <span style={{ fontSize: 15 }}>{style.icon}</span>,
              children: <AuditLogEntry item={item} />,
            };
          })}
        />
      )}
    </Card>
  );
}
