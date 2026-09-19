import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin, Typography } from 'antd';
import { getHealth } from '../api/health';

export function HealthPage() {
  const health = useQuery({
    queryKey: ['system', 'health'],
    queryFn: getHealth,
  });

  if (health.isPending) {
    return <Spin tip="Đang kiểm tra API..." />;
  }

  if (health.isError) {
    return (
      <Alert
        type="error"
        message="Không kết nối được ag-go-api"
        description={health.error.message}
      />
    );
  }

  return (
    <Card>
      <Typography.Title level={3}>API health</Typography.Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Status">{health.data.status}</Descriptions.Item>
        <Descriptions.Item label="Service">{health.data.service}</Descriptions.Item>
        <Descriptions.Item label="Timestamp">{health.data.timestamp}</Descriptions.Item>
        <Descriptions.Item label="Uptime">
          {Math.round(health.data.uptime)} seconds
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
