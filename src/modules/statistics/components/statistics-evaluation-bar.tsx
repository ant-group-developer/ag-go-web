import { Flex, Tooltip, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { EVALUATION_COLORS, EVALUATION_KEYS } from '../utils/statistics-colors';
import { formatNumber, percentOf } from '../utils/statistics-format';

type EvaluationCounts = { approved: number; rejected: number; pending: number };

/**
 * Stacked bar of approved / rejected / pending media with a 2px gap between segments and
 * rounded ends. Each segment names itself in a tooltip, so identity never relies on color alone.
 */
export function StatisticsEvaluationBar({
  counts,
  height = 8,
}: {
  counts: EvaluationCounts;
  height?: number;
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const total = counts.approved + counts.rejected + counts.pending;

  if (total === 0) {
    return (
      <div
        style={{ height, borderRadius: height / 2, background: token.colorFillSecondary }}
        aria-hidden
      />
    );
  }

  const segments = EVALUATION_KEYS.filter((key) => counts[key] > 0);
  return (
    <Flex gap={2} style={{ height, width: '100%' }} role="img" aria-label={describe(counts, t)}>
      {segments.map((key, index) => (
        <Tooltip
          key={key}
          title={`${t(`statistics.evaluation.${key}`)}: ${formatNumber(counts[key])} (${percentOf(counts[key], total)}%)`}
        >
          <div
            style={{
              flexGrow: counts[key],
              flexBasis: 0,
              minWidth: 4,
              background: EVALUATION_COLORS[key],
              borderStartStartRadius: index === 0 ? 4 : 0,
              borderEndStartRadius: index === 0 ? 4 : 0,
              borderStartEndRadius: index === segments.length - 1 ? 4 : 0,
              borderEndEndRadius: index === segments.length - 1 ? 4 : 0,
            }}
          />
        </Tooltip>
      ))}
    </Flex>
  );
}

function describe(counts: EvaluationCounts, t: (key: string) => string): string {
  return EVALUATION_KEYS.map(
    (key) => `${t(`statistics.evaluation.${key}`)} ${formatNumber(counts[key])}`,
  ).join(', ');
}

/** Color swatch + label + count, used as the legend of evaluation bars. */
export function StatisticsEvaluationLegend({ counts }: { counts: EvaluationCounts }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const total = counts.approved + counts.rejected + counts.pending;

  return (
    <Flex wrap gap={16} style={{ fontSize: token.fontSizeSM }}>
      {EVALUATION_KEYS.map((key) => (
        <Flex key={key} align="center" gap={6}>
          <span
            style={{ width: 10, height: 10, borderRadius: 3, background: EVALUATION_COLORS[key] }}
          />
          <span style={{ color: token.colorTextSecondary }}>
            {t(`statistics.evaluation.${key}`)}
          </span>
          <strong style={{ color: token.colorText }}>{formatNumber(counts[key])}</strong>
          <span style={{ color: token.colorTextTertiary }}>{percentOf(counts[key], total)}%</span>
        </Flex>
      ))}
    </Flex>
  );
}
