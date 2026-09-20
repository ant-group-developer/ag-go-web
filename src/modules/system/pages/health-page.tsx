import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Alert, Descriptions, Spin } from 'antd';
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
    return (
      <PageContainer title={t('health.title')}>
        <Spin tip={t('health.loading')} />
      </PageContainer>
    );
  }

  if (health.isError) {
    return (
      <PageContainer title={t('health.title')}>
        <Alert type="error" message={t('health.unavailable')} description={health.error.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('health.title')}>
      <Descriptions bordered column={1}>
        <Descriptions.Item label={t('health.status')}>{health.data.status}</Descriptions.Item>
        <Descriptions.Item label={t('health.service')}>{health.data.service}</Descriptions.Item>
        <Descriptions.Item label={t('health.timestamp')}>{health.data.timestamp}</Descriptions.Item>
        <Descriptions.Item label={t('health.uptime')}>
          {Math.round(health.data.uptime)} {t('health.seconds')}
        </Descriptions.Item>
      </Descriptions>
    </PageContainer>
  );
}
