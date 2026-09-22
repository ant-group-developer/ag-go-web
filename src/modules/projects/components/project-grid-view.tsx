'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Avatar,
  Button,
  Col,
  Empty,
  Popconfirm,
  Row,
  Skeleton,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import {
  Camera,
  CheckCircle,
  Clapperboard,
  Clock,
  Eye,
  Folder,
  Image as ImageIcon,
  MapPin,
  SquarePen,
  Trash,
} from 'lucide-react';

import { PROJECT_EVALUATION_STATUS, PROJECT_EVALUATION_STATUS_LABEL } from '../constants/index';
import styles from './project-grid-view.module.css';

const { Paragraph } = Typography;

export interface ProjectGridItem {
  id: string;
  title: string;
  slug: string;
  visibility: 'public' | 'private' | 'internal' | 'unlisted';
  evaluation_status?: string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  cover?: {
    url: string;
    width?: number;
    height?: number;
  } | null;
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
  author?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  } | null;
  folder?: {
    id: string;
    name: string;
    path?: string;
  };
  province?: {
    id: string;
    name: string;
  };
  country?: {
    id: string;
    name: string;
  };
  imageCount?: number;
  videoCount?: number;
}

export const getEvaluationConfig = (
  status: string | undefined,
  token: any,
  t?: (key: string) => string,
) => {
  if (!status) return null;

  const statusStr = status.toLowerCase();
  const isApproved = statusStr === PROJECT_EVALUATION_STATUS.COMPLETED;
  const isRejected = statusStr === PROJECT_EVALUATION_STATUS.FAILED;
  const isPartial = statusStr === PROJECT_EVALUATION_STATUS.PARTIALLY_COMPLETED;
  const isDraft = statusStr === PROJECT_EVALUATION_STATUS.DRAFT;

  let label: string;
  if (t) {
    if (isApproved) label = t('projects.statusCompleted');
    else if (isRejected) label = t('projects.statusFailed');
    else if (isPartial) label = t('projects.statusPartiallyCompleted');
    else if (isDraft) label = t('projects.statusDraft');
    else label = t('projects.statusNeedsEvaluation');
  } else {
    label =
      PROJECT_EVALUATION_STATUS_LABEL[statusStr as keyof typeof PROJECT_EVALUATION_STATUS_LABEL] ||
      PROJECT_EVALUATION_STATUS_LABEL[PROJECT_EVALUATION_STATUS.NEEDS_EVALUATION];
  }

  return {
    color: isApproved
      ? token.colorSuccess
      : isRejected
        ? token.colorError
        : isPartial
          ? token.colorInfo
          : isDraft
            ? token.colorTextSecondary
            : token.colorWarning,
    bgColor: isApproved
      ? token.colorSuccessBg
      : isRejected
        ? token.colorErrorBg
        : isPartial
          ? token.colorInfoBg
          : isDraft
            ? token.colorFillSecondary
            : token.colorWarningBg,
    label,
  };
};

interface ProjectGridViewProps {
  items: ProjectGridItem[];
  isLoading: boolean;
  isAdminView?: boolean;
  canEvaluate?: boolean;
  onView?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (item: ProjectGridItem) => void;
  onEvaluate?: (item: ProjectGridItem) => void;
  isDeletingId?: string | null;
}

export function ProjectGridView({
  items,
  isLoading,
  isAdminView = false,
  canEvaluate = false,
  onView,
  onEdit,
  onDelete,
  onEvaluate,
  isDeletingId,
}: ProjectGridViewProps) {
  const { token } = theme.useToken();
  const { t } = useTranslation();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

  const handleOpenDrawer = (projectId: string) => {
    if (onView) {
      onView(projectId);
      return;
    }
    setSelectedProjectId(projectId);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <Row gutter={[24, 24]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Col xs={24} sm={24} md={12} lg={12} xl={8} xxl={6} key={`skeleton-${i}`}>
            <div
              className={styles.card}
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                cursor: 'default',
              }}
            >
              {/* Nền ảnh mờ */}
              <div
                className={styles.skeletonCard}
                style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
              />

              {/* Status Tag (Top Left) */}
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <Skeleton.Button active size="small" style={{ width: 80, borderRadius: 100 }} />
              </div>

              {/* Media Counts (Top Right) */}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                <Skeleton.Button active size="small" style={{ width: 50, borderRadius: 100 }} />
                <Skeleton.Button active size="small" style={{ width: 50, borderRadius: 100 }} />
              </div>

              {/* Title & Info (Bottom) */}
              <div className={styles.titleWrapper}>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: '90%', height: 24, borderRadius: 4 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Skeleton.Avatar
                    active
                    size="small"
                    shape="circle"
                    style={{ width: 20, height: 20 }}
                  />
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: '60%', height: 16, borderRadius: 4 }}
                  />
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div style={{ padding: '40px 0' }}>
        <Empty
          description={<Typography.Text type="secondary">{t('projects.empty')}</Typography.Text>}
        />
      </div>
    );
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return dayjs(dateString).format('HH:mm DD/MM/YYYY');
  };

  return (
    <>
      <Row gutter={[24, 24]}>
        {items.map((item) => {
          const evalConfig = getEvaluationConfig(item.evaluation_status, token, t);

          return (
            <Col xs={24} sm={24} md={12} lg={12} xl={8} xxl={6} key={item.id}>
              <div className={styles.card}>
                {/* Ảnh full card */}
                {item.cover?.url ? (
                  <img alt={item.title} src={item.cover.url} className={styles.image} />
                ) : (
                  <div className={styles.placeholderImage}>
                    <Camera style={{ width: 48, height: 48 }} strokeWidth={1.2} />
                  </div>
                )}

                <div className={styles.gradient} />

                {evalConfig && (
                  <div className={styles.statusTag}>
                    <div
                      style={{
                        backgroundColor: evalConfig.bgColor,
                        color: evalConfig.color,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {evalConfig.label}
                    </div>
                  </div>
                )}

                {/* Media counts - góc phải trên */}
                <div className={styles.mediaCounts}>
                  {(item.imageCount ?? 0) > 0 && (
                    <Tooltip title={`${item.imageCount} ${t('media.image')}`}>
                      <div className={styles.mediaCountBadge}>
                        <ImageIcon size={14} />
                        <span>{item.imageCount}</span>
                      </div>
                    </Tooltip>
                  )}
                  {(item.videoCount ?? 0) > 0 && (
                    <Tooltip title={`${item.videoCount} ${t('media.video')}`}>
                      <div className={styles.mediaCountBadge}>
                        <Clapperboard size={14} />
                        <span>{item.videoCount}</span>
                      </div>
                    </Tooltip>
                  )}
                </div>

                {/* Title - góc dưới */}
                <div className={styles.titleWrapper}>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{
                      marginBottom: 0,
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: '22px',
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </Paragraph>
                </div>

                {/* Hover overlay */}
                <div className={styles.hoverOverlay}>
                  {/* Project Info */}
                  <div className={styles.infoBox}>
                    {/* Location */}
                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <MapPin size={16} className={styles.iconColor} />
                      </div>
                      <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>{t('common.location')}</div>
                        <div
                          className={styles.infoValue}
                          title={
                            [item.province?.name, item.country?.name].filter(Boolean).join(', ') ||
                            '—'
                          }
                        >
                          {[item.province?.name, item.country?.name].filter(Boolean).join(', ') ||
                            '—'}
                        </div>
                      </div>
                    </div>

                    {/* Owner */}
                    <div className={styles.infoRow}>
                      <Avatar
                        size={32}
                        src={item.author?.avatar}
                        style={{ flexShrink: 0, backgroundColor: '#1677ff' }}
                      >
                        {item.author?.name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>{t('common.author')}</div>
                        <div
                          className={styles.infoValue}
                          title={item.author?.name || t('common.unknown')}
                        >
                          {item.author?.name || t('common.unknown')}
                        </div>
                      </div>
                    </div>

                    {/* Folder */}
                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <Folder size={16} className={styles.iconColor} />
                      </div>
                      <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>{t('projects.folder')}</div>
                        <div
                          className={styles.infoValue}
                          title={item.folder?.path || item.folder?.name || '—'}
                        >
                          {item.folder?.name || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Updated */}
                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <Clock size={16} className={styles.iconColor} />
                      </div>
                      <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>{t('projects.updatedAt')}</div>
                        <div className={styles.infoValue}>
                          {formatDate(item.updatedAt || item.publishedAt || item.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={styles.actionsWrapper}>
                    <Tooltip title={t('common.view')}>
                      <Button
                        type="default"
                        shape="circle"
                        size="large"
                        icon={<Eye size={20} />}
                        onClick={() => handleOpenDrawer(item.id)}
                        className={styles.actionButton}
                        aria-label={t('common.view')}
                      />
                    </Tooltip>

                    <Tooltip title={t('common.edit')}>
                      <Button
                        type="default"
                        shape="circle"
                        size="large"
                        icon={<SquarePen size={18} />}
                        onClick={() => onEdit(item.id)}
                        className={styles.actionButton}
                        aria-label={t('common.edit')}
                      />
                    </Tooltip>

                    {canEvaluate && onEvaluate && (
                      <Tooltip title={t('projects.review')}>
                        <Button
                          type="default"
                          shape="circle"
                          size="large"
                          icon={<CheckCircle size={18} />}
                          onClick={() => onEvaluate(item)}
                          className={styles.actionButton}
                          aria-label={t('projects.review')}
                        />
                      </Tooltip>
                    )}

                    <Popconfirm
                      title={t('projects.deleteConfirm', { name: item.title })}
                      onConfirm={() => onDelete(item)}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title={t('common.delete')}>
                        <Button
                          danger
                          shape="circle"
                          size="large"
                          icon={<Trash size={18} />}
                          disabled={isDeletingId === item.id}
                          className={styles.actionButton}
                          aria-label={t('common.delete')}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </>
  );
}
