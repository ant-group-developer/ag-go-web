import { Card, Col, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Typography.Title level={2}>{t('home.title')}</Typography.Title>
      <Typography.Paragraph>{t('home.description')}</Typography.Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title={t('home.repositories')}>{t('home.repositoriesValue')}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('home.ui')}>{t('home.uiValue')}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('home.serverState')}>{t('home.serverStateValue')}</Card>
        </Col>
      </Row>
    </>
  );
}
