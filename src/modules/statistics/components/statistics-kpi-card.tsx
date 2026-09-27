import { Flex, Tag, Tooltip, Typography, theme } from 'antd';
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatisticsDelta } from '../utils/statistics-format';

export type StatisticsKpiScope = 'snapshot' | 'period';

/**
 * One headline number. `scope` tells whether it is the current state or a count of the selected
 * period. The change against the previous period always describes a period count: next to the
 * value on period cards, next to the period sub-line on snapshot cards. The change is shown in
 * neutral ink: more uploads or more decisions are not good or bad by themselves.
 */
export function StatisticsKpiCard({
  title,
  value,
  icon,
  accent,
  scope,
  sub,
  delta,
  footer,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  accent: string;
  scope: StatisticsKpiScope;
  sub?: ReactNode;
  delta?: StatisticsDelta;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      gap={10}
      style={{
        padding: 16,
        height: '100%',
        borderRadius: 12,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" justify="space-between" gap={8}>
        <Flex
          align="center"
          justify="center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accent}1a`,
            color: accent,
          }}
        >
          {icon}
        </Flex>
        <Tag bordered={false} style={{ marginInlineEnd: 0, fontSize: 11 }}>
          {t(`statistics.scope.${scope}`)}
        </Tag>
      </Flex>

      <Flex vertical gap={2}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {title}
        </Typography.Text>
        <Flex align="baseline" gap={8} wrap>
          <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
          {delta && scope === 'period' ? <DeltaBadge delta={delta} /> : null}
        </Flex>
        {sub ? (
          <Flex align="center" gap={6} wrap>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {sub}
            </Typography.Text>
            {delta && scope === 'snapshot' ? <DeltaBadge delta={delta} /> : null}
          </Flex>
        ) : null}
      </Flex>
      {footer}
    </Flex>
  );
}

function DeltaBadge({ delta }: { delta: StatisticsDelta }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const content =
    delta.direction === 'flat' ? (
      <>
        <Minus size={12} />
        {t('statistics.delta.flat')}
      </>
    ) : delta.direction === 'new' ? (
      <>
        <Sparkles size={12} />
        {t('statistics.delta.new')}
      </>
    ) : (
      <>
        {delta.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {delta.percent}%
      </>
    );

  return (
    <Tooltip title={t('statistics.delta.vsPrevious')}>
      <Flex
        align="center"
        gap={2}
        style={{
          padding: '1px 8px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          color: token.colorTextSecondary,
          background: token.colorFillTertiary,
        }}
      >
        {content}
      </Flex>
    </Tooltip>
  );
}
