import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getHealth } from '../api/health';
import { systemQueryKeys } from '../queries/system-query-keys';

export function HealthPage() {
  const { t } = useTranslation();
  const health = useQuery({
    queryKey: systemQueryKeys.health(),
    queryFn: getHealth,
  });

  if (health.isPending) {
    return <Spin tip={t('health.loading')} />;
  }

  if (health.isError) {
    return (
      <Alert type="error" message={t('health.unavailable')} description={health.error.message} />
    );
  }

  return (
    <Card>
      <Typography.Title level={3}>{t('health.title')}</Typography.Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label={t('health.status')}>{health.data.status}</Descriptions.Item>
        <Descriptions.Item label={t('health.service')}>{health.data.service}</Descriptions.Item>
        <Descriptions.Item label={t('health.timestamp')}>{health.data.timestamp}</Descriptions.Item>
        <Descriptions.Item label={t('health.uptime')}>
          {Math.round(health.data.uptime)} {t('health.seconds')}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
