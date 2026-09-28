import { Avatar, Flex, Space, Tag, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import type { AuditLog } from '../../audit/api/audit';
import { AuditLogBody } from './project-audit-log-body';
import { isBulkAuditLog } from './project-audit-log-details';

/** One audit timeline entry: action label, details, actor and time. `extra` sits after the label. */
export function AuditLogEntry({ item, extra }: { item: AuditLog; extra?: ReactNode }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const actor = item.actorUser?.name || item.actorUser?.email || item.actorUserId;
  const label = t(`projects.auditActions.${item.action}`, { defaultValue: item.action });

  return (
    <Flex vertical gap={4} style={{ paddingBottom: 4 }}>
      <Space size={8} wrap>
        <Typography.Text strong>{label}</Typography.Text>
        {extra ?? (
          <Tag
            bordered={false}
            style={{ marginInlineEnd: 0, fontSize: 11, fontFamily: token.fontFamilyCode }}
          >
            {item.action}
          </Tag>
        )}
        {isBulkAuditLog(item) ? (
          <Tag bordered={false} color="purple" style={{ marginInlineEnd: 0 }}>
            {t('projects.auditDetails.bulk')}
          </Tag>
        ) : null}
      </Space>
      <AuditLogBody item={item} />
      <Space size={6} style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
        <Avatar size={18} src={item.actorUser?.avatar || undefined}>
          {actor.charAt(0).toUpperCase()}
        </Avatar>
        <span>{actor}</span>
        <span>·</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(item.createdAt)}</span>
      </Space>
    </Flex>
  );
}
