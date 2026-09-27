import {
  AppstoreOutlined,
  CalendarOutlined,
  CloudServerOutlined,
  CloudUploadOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  TagsOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Card, Col, Descriptions, Flex, Row, Space, Tag, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { Project } from '../types/project.type';

const PROJECT_STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  completed: 'success',
  partially_completed: 'warning',
  failed: 'error',
};

const PROJECT_STATUS_LABEL_KEYS: Record<string, string> = {
  draft: 'projects.statusDraft',
  pending: 'projects.statusPending',
  completed: 'projects.statusCompleted',
  partially_completed: 'projects.statusPartiallyCompleted',
  failed: 'projects.statusFailed',
};

/** Icon + text label used for every field so the card scans quickly. */
function FieldLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Space size={6}>
      {icon}
      {children}
    </Space>
  );
}

/** Compact KPI tile: tinted icon badge, small label and a large value. */
function StatTile({
  icon,
  label,
  value,
  color,
  background,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  color: string;
  background: string;
}) {
  const { token } = theme.useToken();
  return (
    <Flex
      align="center"
      gap={12}
      style={{
        height: '100%',
        padding: '12px 14px',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
    >
      <Flex
        align="center"
        justify="center"
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: token.borderRadius,
          background,
          color,
          fontSize: 18,
        }}
      >
        {icon}
      </Flex>
      <Flex vertical style={{ minWidth: 0 }}>
        <Typography.Text type="secondary" ellipsis style={{ fontSize: token.fontSizeSM }}>
          {label}
        </Typography.Text>
        <Typography.Text
          strong
          style={{
            fontSize: token.fontSizeHeading4,
            lineHeight: 1.3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

/** Summary card at the top of the project detail / evaluation drawer. */
export function ProjectOverviewCard({ project }: { project: Project }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const statusLabelKey = PROJECT_STATUS_LABEL_KEYS[project.evaluationStatus];
  const location = [project.countryName, project.provinceName].filter(Boolean).join(' / ');
  const ownerName = project.ownerUser?.name || project.ownerUser?.email || t('common.unknown');

  const stats = [
    {
      key: 'images',
      icon: <PictureOutlined />,
      label: t('media.image'),
      value: project.imageCount,
      color: token.blue6,
      background: token.blue1,
    },
    {
      key: 'videos',
      icon: <VideoCameraOutlined />,
      label: t('media.video'),
      value: project.videoCount,
      color: token.purple6,
      background: token.purple1,
    },
    {
      key: 'original',
      icon: <CloudUploadOutlined />,
      label: t('projects.originalSize'),
      value: formatFileSize(project.originalBytes),
      color: token.cyan6,
      background: token.cyan1,
    },
    {
      key: 'rendered',
      icon: <CloudServerOutlined />,
      label: t('projects.renderedSize'),
      value: formatFileSize(project.renderedBytes),
      color: token.green6,
      background: token.green1,
    },
  ];

  const secondaryIcon = { color: token.colorTextTertiary };

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          <InfoCircleOutlined style={{ color: token.colorPrimary }} />
          {t('projects.projectInformation')}
        </Space>
      }
      extra={
        <Tag
          color={PROJECT_STATUS_COLORS[project.evaluationStatus] ?? 'default'}
          style={{ marginInlineEnd: 0 }}
        >
          {statusLabelKey ? t(statusLabelKey) : project.evaluationStatus}
        </Tag>
      }
      styles={{ body: { padding: 16 } }}
    >
      <Row gutter={[24, 16]}>
        <Col xs={24} xxl={14}>
          <Descriptions
            layout="vertical"
            size="small"
            colon={false}
            column={{ xs: 1, sm: 2, lg: 3 }}
            styles={{
              label: {
                color: token.colorTextSecondary,
                fontSize: token.fontSizeSM,
                paddingBottom: 2,
              },
              content: { fontWeight: 500, paddingBottom: 12 },
            }}
          >
            <Descriptions.Item
              label={<FieldLabel icon={<FileTextOutlined />}>{t('projects.name')}</FieldLabel>}
            >
              <Typography.Text strong ellipsis={{ tooltip: project.name }}>
                {project.name}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={<FieldLabel icon={<FolderOutlined />}>{t('projects.folder')}</FieldLabel>}
            >
              <Typography.Text ellipsis={{ tooltip: project.folderPath || project.folderId }}>
                {project.folderPath || project.folderId}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FieldLabel icon={<EnvironmentOutlined />}>{t('projects.location')}</FieldLabel>
              }
            >
              {location ? (
                <Space size={6}>
                  {project.countryFlagUrl ? (
                    <img
                      src={project.countryFlagUrl}
                      alt=""
                      style={{ width: 18, borderRadius: 2, display: 'block' }}
                    />
                  ) : null}
                  {location}
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={<FieldLabel icon={<AppstoreOutlined />}>{t('projects.category')}</FieldLabel>}
            >
              {project.categoryName || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={<FieldLabel icon={<UserOutlined />}>{t('common.author')}</FieldLabel>}
            >
              <Space size={8}>
                <Avatar size={22} src={project.ownerUser?.avatar}>
                  {ownerName.charAt(0).toUpperCase()}
                </Avatar>
                {ownerName}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item
              label={<FieldLabel icon={<CalendarOutlined />}>{t('projects.createdAt')}</FieldLabel>}
            >
              <Flex vertical>
                <span>{formatDate(project.createdAt)}</span>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: token.fontSizeSM, fontWeight: 400 }}
                >
                  {t('projects.updatedAt')}: {formatDate(project.updatedAt)}
                </Typography.Text>
              </Flex>
            </Descriptions.Item>
          </Descriptions>
        </Col>
        <Col xs={24} xxl={10}>
          <Row gutter={[12, 12]}>
            {stats.map(({ key, ...stat }) => (
              <Col key={key} xs={12} md={6} xxl={12}>
                <StatTile {...stat} />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      <Flex
        vertical
        gap={10}
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px dashed ${token.colorBorderSecondary}`,
        }}
      >
        <Flex gap={12} align="baseline">
          <Typography.Text type="secondary" style={{ flexShrink: 0, minWidth: 88 }}>
            <FieldLabel icon={<TagsOutlined style={secondaryIcon} />}>
              {t('projects.tags')}
            </FieldLabel>
          </Typography.Text>
          {project.tags?.length ? (
            <Flex wrap gap={6}>
              {project.tags.map((tag) => (
                <Tag key={tag} bordered={false} color="blue" style={{ marginInlineEnd: 0 }}>
                  #{tag}
                </Tag>
              ))}
            </Flex>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Flex>
        <Flex gap={12} align="baseline">
          <Typography.Text type="secondary" style={{ flexShrink: 0, minWidth: 88 }}>
            <FieldLabel icon={<FileTextOutlined style={secondaryIcon} />}>
              {t('projects.description')}
            </FieldLabel>
          </Typography.Text>
          <Typography.Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: t('common.viewMore') }}
            style={{ margin: 0, flex: 1, minWidth: 0 }}
          >
            {project.description || '-'}
          </Typography.Paragraph>
        </Flex>
      </Flex>
    </Card>
  );
}
