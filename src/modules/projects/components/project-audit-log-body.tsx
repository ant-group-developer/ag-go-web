import { ArrowRightOutlined, FileOutlined, FolderOutlined } from '@ant-design/icons';
import { Flex, Tag, Typography, theme } from 'antd';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditLog } from '../../audit/api/audit';
import { describeAuditLog } from './project-audit-log-details';

type AuditValue = string | number | string[] | null;
type AuditChange = { field: string; from: AuditValue; to: AuditValue };

type AuditData = {
  fileName?: string | null;
  name?: string;
  folder?: string | null;
  previousEvaluationStatus?: string;
  evaluationStatus?: string;
  comment?: string | null;
  changes?: AuditChange[];
};

const EVALUATION_STYLES: Record<string, { color: string; labelKey: string }> = {
  pending: { color: 'processing', labelKey: 'projects.evaluationPending' },
  approved: { color: 'success', labelKey: 'projects.evaluationApproved' },
  rejected: { color: 'error', labelKey: 'projects.evaluationRejected' },
};

/** Long free text (descriptions, captions) stays on a couple of lines in the timeline. */
const VALUE_ELLIPSIS = { rows: 2, expandable: 'collapsible' as const };

function asData(value: unknown): AuditData {
  return value && typeof value === 'object' ? (value as AuditData) : {};
}

/** What the entry is about, below its title: the file, the changed fields, the verdict... */
export function AuditLogBody({ item }: { item: AuditLog }) {
  const { t } = useTranslation();
  const after = asData(item.afterData);
  const before = asData(item.beforeData);
  const fileName = after.fileName || before.fileName || item.mediaFileName || null;

  switch (item.action) {
    case 'evaluation_changed':
      return (
        <Flex vertical gap={6}>
          <Flex align="center" gap={6} wrap>
            <FileLabel name={fileName} />
            <EvaluationTransition
              from={after.previousEvaluationStatus}
              to={after.evaluationStatus}
            />
          </Flex>
          {after.comment ? <Quote>{after.comment}</Quote> : null}
        </Flex>
      );
    case 'media_attached':
    case 'media_deleted':
      return <FileLabel name={fileName} />;
    case 'media_updated':
      return (
        <Flex vertical gap={6}>
          <FileLabel name={fileName} />
          {after.changes?.length ? <ChangeList changes={after.changes} /> : null}
        </Flex>
      );
    case 'project_created':
    case 'project_deleted': {
      const data = item.action === 'project_created' ? after : before;
      return data.folder ? <FolderLabel path={data.folder} /> : null;
    }
    case 'project_updated':
      // Entries written before changes were recorded only hold the values after the update.
      return after.changes?.length ? <ChangeList changes={after.changes} /> : null;
    default: {
      const summary = describeAuditLog(item, t);
      return summary ? <Typography.Text type="secondary">{summary}</Typography.Text> : null;
    }
  }
}

function FileLabel({ name }: { name: string | null }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0, maxWidth: '100%' }}>
      <FileOutlined style={{ color: token.colorTextTertiary, flexShrink: 0 }} />
      {name ? (
        <Typography.Text strong ellipsis={{ tooltip: name }} style={{ minWidth: 0 }}>
          {name}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary" italic>
          {t('projects.auditDetails.unknownFile')}
        </Typography.Text>
      )}
    </Flex>
  );
}

function FolderLabel({ path }: { path: string }) {
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <FolderOutlined style={{ color: token.colorTextTertiary, flexShrink: 0 }} />
      <Typography.Text type="secondary" ellipsis={{ tooltip: path }} style={{ minWidth: 0 }}>
        {path}
      </Typography.Text>
    </Flex>
  );
}

function EvaluationTag({ status }: { status: string }) {
  const { t } = useTranslation();
  const style = EVALUATION_STYLES[status];
  return (
    <Tag color={style?.color} style={{ marginInlineEnd: 0 }}>
      {style ? t(style.labelKey) : status}
    </Tag>
  );
}

function EvaluationTransition({ from, to }: { from?: string; to?: string }) {
  const { token } = theme.useToken();
  if (!to) {
    return null;
  }
  return (
    <Flex align="center" gap={6}>
      {from && from !== to ? (
        <>
          <EvaluationTag status={from} />
          <ArrowRightOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
        </>
      ) : null}
      <EvaluationTag status={to} />
    </Flex>
  );
}

function Quote({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <Typography.Paragraph
      ellipsis={VALUE_ELLIPSIS}
      style={{
        margin: 0,
        padding: '6px 10px',
        background: token.colorFillQuaternary,
        borderInlineStart: `3px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusSM,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </Typography.Paragraph>
  );
}

function ChangeList({ changes }: { changes: AuditChange[] }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  return (
    <Flex
      vertical
      gap={6}
      style={{
        padding: '8px 10px',
        background: token.colorFillQuaternary,
        borderRadius: token.borderRadius,
      }}
    >
      {changes.map((change) => (
        <Flex key={change.field} gap={8} align="baseline" wrap style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ flexShrink: 0, minWidth: 76 }}>
            {t(`projects.auditFields.${change.field}`, { defaultValue: change.field })}
          </Typography.Text>
          <Flex gap={6} align="baseline" wrap style={{ flex: 1, minWidth: 0 }}>
            <ChangeValue value={change.from} removed t={t} />
            <ArrowRightOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
            <ChangeValue value={change.to} t={t} />
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

function ChangeValue({
  value,
  removed = false,
  t,
}: {
  value: AuditValue;
  removed?: boolean;
  t: TFunction;
}) {
  if (value === null || value === '') {
    return (
      <Typography.Text type="secondary" italic>
        {t('projects.auditDetails.emptyValue')}
      </Typography.Text>
    );
  }
  if (Array.isArray(value)) {
    return (
      <Flex gap={4} wrap>
        {value.map((entry) => (
          <Tag
            key={entry}
            bordered={false}
            style={{
              marginInlineEnd: 0,
              textDecoration: removed ? 'line-through' : undefined,
              opacity: removed ? 0.65 : 1,
            }}
          >
            {entry}
          </Tag>
        ))}
      </Flex>
    );
  }
  return (
    <Typography.Paragraph
      delete={removed}
      type={removed ? 'secondary' : undefined}
      ellipsis={VALUE_ELLIPSIS}
      style={{ margin: 0, minWidth: 0, flex: '0 1 auto', whiteSpace: 'pre-wrap' }}
    >
      {String(value)}
    </Typography.Paragraph>
  );
}
