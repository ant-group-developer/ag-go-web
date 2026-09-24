import { PageContainer } from '@ant-design/pro-components';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Row,
  Skeleton,
  Space,
  Steps,
  Tag,
  theme,
  Typography,
} from 'antd';
import {
  ArrowRight,
  BadgeCheck,
  CloudUpload,
  Download,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Plus,
  Stamp,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../../../auth/auth-client';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { usePermissions } from '../../account/hooks/use-current-account';
import { usePublicSettings } from '../../settings/hooks/use-settings';
import { HOME_FEATURE_GROUPS, HOME_FEATURES, type HomeFeature } from '../config/home-features';

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

const WORKFLOW_STEPS = [
  { key: 'folders', icon: FolderTree },
  { key: 'project', icon: FolderPlus },
  { key: 'upload', icon: CloudUpload },
  { key: 'render', icon: Stamp },
  { key: 'evaluate', icon: BadgeCheck },
  { key: 'download', icon: Download },
] as const;

const ACCESS_LEVELS = ['viewer', 'editor', 'manager'] as const;
const ACCESS_LEVEL_COLORS = { viewer: 'default', editor: 'blue', manager: 'purple' } as const;

export function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth0();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const webSettings = usePublicSettings();
  const { can, canAny, isLoading } = usePermissions();

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

  const featureGroups = useMemo(
    () =>
      HOME_FEATURE_GROUPS.map((group) => ({
        ...group,
        features: HOME_FEATURES.filter(
          (feature) =>
            feature.group === group.key &&
            (!feature.permission || canAny([feature.permission].flat())),
        ),
      })).filter((group) => group.features.length > 0),
    [canAny],
  );

  const quickActions = [
    {
      key: 'createProject',
      to: '/projects?create=true',
      icon: <Plus size={16} />,
      primary: true,
      allowed: can(GO_PERMISSIONS.PROJECT_EDIT) && can(GO_PERMISSIONS.PROJECT_READ),
    },
    {
      key: 'viewProjects',
      to: '/projects',
      icon: <FolderOpen size={16} />,
      allowed: can(GO_PERMISSIONS.PROJECT_READ),
    },
    {
      key: 'manageFolders',
      to: '/folders',
      icon: <FolderTree size={16} />,
      allowed: can(GO_PERMISSIONS.FOLDER_MANAGE),
    },
  ].filter((action) => action.allowed);

  const siteName = webSettings.data?.siteName || t('app.title');

  return (
    <PageContainer title={t('home.title')}>
      <Flex vertical gap={24}>
        <Card
          style={{
            borderRadius: 12,
            background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 70%)`,
          }}
        >
          <Flex vertical gap={8}>
            <Typography.Text type="secondary" strong>
              {siteName}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {user?.name ? t('home.greeting', { name: user.name }) : t('home.greetingFallback')}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ maxWidth: 720, marginBottom: 8 }}>
              {t('home.description')}
            </Typography.Paragraph>
            {isLoading ? (
              <Skeleton.Button active style={{ width: 280 }} />
            ) : quickActions.length > 0 ? (
              <Space wrap>
                {quickActions.map((action) => (
                  <Link key={action.key} to={action.to}>
                    <Button type={action.primary ? 'primary' : 'default'} icon={action.icon}>
                      {t(`home.actions.${action.key}`)}
                    </Button>
                  </Link>
                ))}
              </Space>
            ) : null}
          </Flex>
        </Card>

        <Card title={t('home.workflowTitle')} style={{ borderRadius: 12 }}>
          <Steps
            direction={screens.xl ? 'horizontal' : 'vertical'}
            labelPlacement={screens.xl ? 'vertical' : 'horizontal'}
            current={-1}
            items={WORKFLOW_STEPS.map(({ key, icon: Icon }) => ({
              status: 'finish',
              title: t(`home.workflow.${key}`),
              description: t(`home.workflow.${key}Description`),
              icon: (
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                  }}
                >
                  <Icon size={16} />
                </Flex>
              ),
            }))}
          />
        </Card>

        <Flex vertical gap={16}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('home.featuresTitle')}
          </Typography.Title>
          {isLoading ? (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 3 }, (_, index) => (
                <Col key={index} xs={24} md={12} xl={8}>
                  <Card style={{ borderRadius: 12 }}>
                    <Skeleton active avatar paragraph={{ rows: 1 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : featureGroups.length === 0 ? (
            <Card style={{ borderRadius: 12 }}>
              <Empty description={t('home.featuresEmpty')} />
            </Card>
          ) : (
            featureGroups.map((group) => (
              <Flex key={group.key} vertical gap={12}>
                <Typography.Text type="secondary" strong style={{ textTransform: 'uppercase' }}>
                  {t(`home.groups.${group.key}`)}
                </Typography.Text>
                <Row gutter={[16, 16]}>
                  {group.features.map((feature) => (
                    <Col key={feature.key} xs={24} md={12} xl={8}>
                      <FeatureCard feature={feature} color={group.color} />
                    </Col>
                  ))}
                </Row>
              </Flex>
            ))
          )}
        </Flex>

        <Card title={t('home.accessTitle')} style={{ borderRadius: 12 }}>
          <Typography.Paragraph type="secondary">
            {t('home.accessDescription')}
          </Typography.Paragraph>
          <Row gutter={[16, 12]}>
            {ACCESS_LEVELS.map((level) => (
              <Col key={level} xs={24} md={8}>
                <Flex vertical gap={4} align="flex-start">
                  <Tag color={ACCESS_LEVEL_COLORS[level]}>{t(`folderAccess.levels.${level}`)}</Tag>
                  <Typography.Text>{t(`folderAccess.levelDescriptions.${level}`)}</Typography.Text>
                </Flex>
              </Col>
            ))}
          </Row>
        </Card>
      </Flex>
    </PageContainer>
  );
}

function FeatureCard({ feature, color }: { feature: HomeFeature; color: string }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const Icon = feature.icon;

  return (
    <Link to={feature.path} style={{ display: 'block', height: '100%', color: 'inherit' }}>
      <Card
        hoverable
        style={{ height: '100%', borderRadius: 12 }}
        styles={{ body: { padding: 16 } }}
      >
        <Flex gap={12} align="flex-start">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 10,
              background: `${color}1a`,
              color,
            }}
          >
            <Icon size={20} />
          </Flex>
          <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Typography.Text strong>{t(`menu.${feature.key}`)}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t(`home.features.${feature.key}`)}
            </Typography.Text>
            <Flex align="center" gap={4} style={{ color: token.colorPrimary, fontSize: 13 }}>
              {t('home.open')}
              <ArrowRight size={14} />
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
}
