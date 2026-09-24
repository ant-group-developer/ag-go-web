import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAccessToken } from '../../../auth/auth-client';

function decodeTokenPayload(token: string): Record<string, unknown> {
  const encodedPayload = token.split('.')[1];
  if (!encodedPayload) {
    throw new Error('Invalid JWT: payload is missing');
  }

  const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binaryPayload = atob(paddedBase64);
  const payloadBytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<string, unknown>;
}

export function HomePage() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    void getAccessToken()
      .then((token) => {
        console.groupCollapsed('[AG Go] Auth0 access token');
        console.log('Token:', token);
        console.log('Payload:', decodeTokenPayload(token));
        console.groupEnd();
      })
      .catch((error: unknown) => {
        console.error('[AG Go] Failed to retrieve or decode access token', error);
      });
  }, []);

  return (
    <PageContainer title={t('home.title')}>
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
    </PageContainer>
  );
}
