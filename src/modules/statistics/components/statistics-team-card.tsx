import { Avatar, Flex, Segmented, Typography, theme } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatisticsTeam, StatisticsUser } from '../types/statistics.type';
import { formatNumber } from '../utils/statistics-format';
import { StatisticsSectionCard, type StatisticsQueryState } from './statistics-section-card';

type TeamView = 'evaluators' | 'contributors';

type RankedPerson = { userId: string; user: StatisticsUser; value: number; detail: string };

/** Who evaluated and who brought in work during the period, ranked by volume. */
export function StatisticsTeamCard({
  query,
}: {
  query: StatisticsQueryState & { data: StatisticsTeam | undefined };
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<TeamView>('evaluators');
  const team = query.data;

  const people: RankedPerson[] =
    view === 'evaluators'
      ? (team?.evaluators ?? []).map((row) => ({
          userId: row.userId,
          user: row.user,
          value: row.total,
          detail: t('statistics.team.decisions', {
            approved: formatNumber(row.approved),
            rejected: formatNumber(row.rejected),
          }),
        }))
      : (team?.contributors ?? []).map((row) => ({
          userId: row.userId,
          user: row.user,
          value: row.mediaAdded,
          detail: t('statistics.team.contributions', {
            projects: formatNumber(row.projectsCreated),
            media: formatNumber(row.mediaAdded),
          }),
        }));
  const maxValue = Math.max(1, ...people.map((person) => person.value));

  return (
    <StatisticsSectionCard
      title={t('statistics.team.title')}
      extra={
        <Segmented<TeamView>
          size="small"
          value={view}
          onChange={setView}
          options={[
            { label: t('statistics.team.evaluators'), value: 'evaluators' },
            { label: t('statistics.team.contributors'), value: 'contributors' },
          ]}
        />
      }
      query={query}
      isEmpty={people.length === 0}
      emptyText={t('statistics.team.empty')}
    >
      <Flex vertical gap={14}>
        {people.map((person, index) => (
          <RankedPersonRow key={person.userId} person={person} rank={index + 1} max={maxValue} />
        ))}
      </Flex>
    </StatisticsSectionCard>
  );
}

function RankedPersonRow({
  person,
  rank,
  max,
}: {
  person: RankedPerson;
  rank: number;
  max: number;
}) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const name = person.user?.name || person.user?.email || t('statistics.team.unknownUser');

  return (
    <Flex vertical gap={6}>
      <Flex align="center" gap={10}>
        <span
          style={{
            width: 18,
            textAlign: 'right',
            color: token.colorTextTertiary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rank}
        </span>
        <Avatar size={28} src={person.user?.avatar || undefined}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Flex vertical style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text strong ellipsis={{ tooltip: name }}>
            {name}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {person.detail}
          </Typography.Text>
        </Flex>
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(person.value)}</strong>
      </Flex>
      <div
        style={{
          marginInlineStart: 28,
          height: 4,
          borderRadius: 2,
          background: token.colorFillTertiary,
        }}
      >
        <div
          style={{
            width: `${(person.value / max) * 100}%`,
            height: '100%',
            borderRadius: 2,
            background: token.colorPrimary,
          }}
        />
      </div>
    </Flex>
  );
}
