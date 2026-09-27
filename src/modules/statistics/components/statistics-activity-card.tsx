import { Tag, Timeline, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../account/hooks/use-current-account';
import { getAuditActionStyle } from '../../projects/components/project-audit-action-styles';
import { AuditLogEntry } from '../../projects/components/project-audit-log-entry';
import type { StatisticsActivity } from '../types/statistics.type';
import { projectDetailLink } from '../utils/statistics-links';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

/** Latest project audit entries across the viewer's folders, tagged with their project. */
export function StatisticsActivityCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsActivity | undefined };
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const access = usePermissions();
  const items = query.data?.items ?? [];

  return (
    <StatisticsSectionCard
      title={t('statistics.activity.title')}
      query={query}
      isEmpty={items.length === 0}
      fillHeight
    >
      {/* Takes the height the row already has and scrolls only when the entries do not fit. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 240 }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingTop: 6 }}>
          <Timeline
            items={items.map((item) => {
              const style = getAuditActionStyle(item.action);
              const href = projectDetailLink(item.projectId, access);
              const projectTag = (
                <Tag bordered={false} style={{ marginInlineEnd: 0, maxWidth: 220 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'bottom',
                    }}
                  >
                    {item.projectName}
                  </span>
                </Tag>
              );
              return {
                key: item.id,
                color: token[style.color],
                dot: <span style={{ fontSize: 15 }}>{style.icon}</span>,
                children: (
                  <AuditLogEntry
                    item={item}
                    extra={href ? <Link to={href}>{projectTag}</Link> : projectTag}
                  />
                ),
              };
            })}
          />
        </div>
      </div>
    </StatisticsSectionCard>
  );
}
