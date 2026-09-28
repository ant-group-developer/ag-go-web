import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Empty, Flex, Skeleton, Tag, Timeline, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import {
  getProjectMediaEvaluationHistory,
  type ProjectMedia,
  type ProjectMediaEvaluation,
} from '../../media/api/media';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';

const STATUS_STYLES = {
  approved: { color: 'success', token: 'colorSuccess', icon: <CheckCircleFilled /> },
  rejected: { color: 'error', token: 'colorError', icon: <CloseCircleFilled /> },
  pending: { color: 'processing', token: 'colorPrimary', icon: <ClockCircleFilled /> },
} as const satisfies Record<ProjectMedia['evaluationStatus'], unknown>;

const STATUS_LABEL_KEYS = {
  approved: 'projects.evaluationApproved',
  rejected: 'projects.evaluationRejected',
  pending: 'projects.evaluationPending',
} as const;

/** Evaluation timeline of one file, newest first. */
export function MediaEvaluationHistory({ mediaId }: { mediaId: string }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const history = useQuery({
    queryKey: mediaQueryKeys.evaluationHistory(mediaId),
    queryFn: () => getProjectMediaEvaluationHistory(mediaId),
  });
  const items = history.data ?? [];

  return (
    <Flex vertical gap={12}>
      <Flex align="center" gap={8}>
        <HistoryOutlined style={{ color: token.colorPrimary }} />
        <Typography.Text strong>{t('projects.evaluationHistory')}</Typography.Text>
        {items.length > 0 ? (
          <Tag bordered={false} style={{ marginInlineEnd: 0 }}>
            {items.length}
          </Tag>
        ) : null}
      </Flex>
      {history.isError ? (
        <Alert type="error" showIcon message={history.error.message} />
      ) : history.isPending ? (
        <Skeleton active avatar={{ size: 'small' }} paragraph={{ rows: 2 }} />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('projects.noEvaluationHistory')}
          style={{ marginBlock: 8 }}
        />
      ) : (
        <Timeline
          style={{ marginBottom: -20, paddingTop: 4 }}
          items={items.map((item, index) => {
            const style = STATUS_STYLES[item.evaluationStatus];
            return {
              key: item.id,
              color: token[style.token],
              dot: <span style={{ fontSize: 14, color: token[style.token] }}>{style.icon}</span>,
              children: <EvaluationEntry item={item} latest={index === 0} />,
            };
          })}
        />
      )}
    </Flex>
  );
}

function EvaluationEntry({ item, latest }: { item: ProjectMediaEvaluation; latest: boolean }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const style = STATUS_STYLES[item.evaluationStatus];
  const evaluator =
    item.evaluatedByUser?.name || item.evaluatedByUser?.email || t('common.unknown');

  return (
    <Flex vertical gap={6} style={{ paddingBottom: 4, minWidth: 0 }}>
      <Flex align="center" gap={8} wrap style={{ minWidth: 0 }}>
        <Avatar size={22} src={item.evaluatedByUser?.avatar || undefined} style={{ flexShrink: 0 }}>
          {evaluator.charAt(0).toUpperCase()}
        </Avatar>
        <Typography.Text
          strong
          ellipsis={{ tooltip: item.evaluatedByUser?.email || item.evaluatedBy }}
          style={{ minWidth: 0, maxWidth: '100%', flex: '0 1 auto' }}
        >
          {evaluator}
        </Typography.Text>
        <Tag color={style.color} style={{ marginInlineEnd: 0 }}>
          {t(STATUS_LABEL_KEYS[item.evaluationStatus])}
        </Tag>
        {latest ? (
          <Tag bordered={false} color="blue" style={{ marginInlineEnd: 0 }}>
            {t('projects.evaluationHistoryLatest')}
          </Tag>
        ) : null}
      </Flex>
      {item.comment ? (
        <Typography.Paragraph
          style={{
            margin: 0,
            padding: '8px 12px',
            background: token.colorFillQuaternary,
            borderInlineStart: `3px solid ${token[style.token]}`,
            borderRadius: token.borderRadius,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {item.comment}
        </Typography.Paragraph>
      ) : null}
      <Typography.Text
        type="secondary"
        style={{ fontSize: token.fontSizeSM, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatDate(item.createdAt)}
      </Typography.Text>
    </Flex>
  );
}
