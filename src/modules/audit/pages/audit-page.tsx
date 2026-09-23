import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, List, Spin, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { getProjectAudit } from '../api/audit';

export function AuditPage() {
  const { projectId = '' } = useParams();
  const query = useQuery({
    queryKey: ['audit', 'project', projectId],
    queryFn: () => getProjectAudit(projectId),
    enabled: Boolean(projectId),
  });

  return (
    <PageContainer title="Project audit">
      {query.isLoading ? <Spin /> : null}
      {query.isError ? <Alert type="error" message="Không thể tải audit log" /> : null}
      {query.data?.items.length ? (
        <List
          bordered
          dataSource={query.data.items}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Tag>{item.action}</Tag>}
                description={`${item.actorUser?.name ?? item.actorUser?.email ?? item.actorUserId} · ${new Date(item.createdAt).toLocaleString('vi-VN')}`}
              />
            </List.Item>
          )}
        />
      ) : !query.isLoading && !query.isError ? (
        <Empty description="Chưa có audit log" />
      ) : null}
      <Typography.Text type="secondary">
        Audit chỉ hiển thị trong scope folder mà tài khoản hiện tại được phép xem.
      </Typography.Text>
    </PageContainer>
  );
}
