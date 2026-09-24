import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Col,
  DatePicker,
  Flex,
  Progress,
  Row,
  Segmented,
  Table,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Film,
  FolderKanban,
  HardDrive,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import statsData from '../data/project-media-statistics.json';

const { Text } = Typography;

const GREEN = '#22c55e';
const RED = '#f87171';
const AMBER = '#fbbf24';

function formatNumber(value: number | string | undefined | null) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

function formatUnitValue(value: number, unit: string) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${unit}`;
}

function getHealthStatusMeta(
  status: string,
  t: (key: string) => string,
): { color: string; label: string } {
  const meta: Record<string, { color: string; label: string }> = {
    healthy: { color: GREEN, label: t('statistics.healthHealthy') },
    warning: { color: AMBER, label: t('statistics.healthWarning') },
    critical: { color: RED, label: t('statistics.healthCritical') },
    down: { color: RED, label: t('statistics.healthDown') },
  };
  return meta[status] ?? meta.healthy;
}

/* ------------------------------------------------------------------ */
/*  Top projects by metric config                                      */
/* ------------------------------------------------------------------ */

type TopMetricKey = 'view' | 'media' | 'size' | 'image' | 'video';

type RecentProject = {
  id: string;
  name: string;
  mediaCount: number;
  approved: number;
  approvedPercent: number;
  rejected: number;
  rejectedPercent: number;
  pending: number;
  pendingPercent: number;
  lastUpdated: string;
};

/* ------------------------------------------------------------------ */
/*  Summary card                                                       */
/* ------------------------------------------------------------------ */

type SummaryCardProps = {
  title: string;
  value: number;
  deltaPercent: number;
  trend: 'up' | 'down';
  icon: ReactNode;
  color: string;
};

function SummaryCard({ title, value, deltaPercent, trend, icon, color }: SummaryCardProps) {
  const { token } = theme.useToken();
  const isUp = trend === 'up';
  const deltaColor = isUp ? GREEN : RED;

  return (
    <Flex
      vertical
      gap={12}
      style={{
        padding: 16,
        height: '100%',
        borderRadius: 12,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Flex align="center" justify="space-between">
        <Flex
          align="center"
          justify="center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}1a`,
            color,
          }}
        >
          {icon}
        </Flex>

        <Flex
          align="center"
          gap={2}
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: deltaColor,
            background: `${deltaColor}1a`,
          }}
        >
          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {deltaPercent}%
        </Flex>
      </Flex>

      <Flex vertical gap={2}>
        <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
          {formatNumber(value)}
        </span>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {title}
        </Text>
      </Flex>
    </Flex>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom donut legend                                                */
/* ------------------------------------------------------------------ */

type Segment = {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  size: string;
};

function SegmentLegend({ segments, total }: { segments: Segment[]; total: number }) {
  return (
    <Flex vertical gap={12} style={{ width: '100%' }}>
      {segments.map((s) => (
        <Flex key={s.key} align="center" justify="space-between" gap={12}>
          <Flex align="center" gap={8} style={{ minWidth: 0 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <Text style={{ fontSize: 13 }} ellipsis>
              {s.label}
            </Text>
          </Flex>
          <Flex align="center" gap={8}>
            <Text strong style={{ fontSize: 13 }}>
              {formatNumber(s.value)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, minWidth: 44, textAlign: 'right' }}>
              {((s.value / total) * 100).toFixed(1)}%
            </Text>
            <Text type="secondary" style={{ fontSize: 12, minWidth: 44, textAlign: 'right' }}>
              {s.size}
            </Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

/* ------------------------------------------------------------------ */
/*  Donut                                                              */
/* ------------------------------------------------------------------ */

function DonutChart({
  segments,
  centerLabel,
  height = 220,
}: {
  segments: Segment[];
  centerLabel: string;
  height?: number;
}) {
  const { token } = theme.useToken();
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={3}
            stroke="none"
          >
            {segments.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatNumber(Number(value ?? 0))}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${token.colorBorderSecondary}`,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <Flex
        vertical
        align="center"
        justify="center"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
          {formatNumber(total)}
        </span>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {centerLabel}
        </Text>
      </Flex>
    </div>
  );
}

type StorageStats = {
  total: { value: number; unit: string };
  used: { value: number; unit: string };
  available: { value: number; unit: string };
  usedPercent: number;
};

function StorageStatsCard({ storage }: { storage: StorageStats }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const barColor = storage.usedPercent >= 90 ? RED : storage.usedPercent >= 75 ? AMBER : '#6366f1';

  return (
    <Flex vertical gap={16}>
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={8}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#6366f11a',
              color: '#6366f1',
            }}
          >
            <HardDrive size={16} />
          </Flex>
          <Text style={{ fontSize: 13 }}>{t('statistics.storageUsed')}</Text>
        </Flex>
        <Text strong style={{ fontSize: 13 }}>
          {storage.usedPercent}%
        </Text>
      </Flex>

      <Progress
        percent={storage.usedPercent}
        showInfo={false}
        strokeColor={barColor}
        trailColor={token.colorFillSecondary}
      />

      <Row gutter={12}>
        <Col span={8}>
          <Flex vertical gap={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('statistics.total')}
            </Text>
            <Text strong style={{ fontSize: 15 }}>
              {formatUnitValue(storage.total.value, storage.total.unit)}
            </Text>
          </Flex>
        </Col>
        <Col span={8}>
          <Flex vertical gap={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('statistics.used')}
            </Text>
            <Text strong style={{ fontSize: 15, color: barColor }}>
              {formatUnitValue(storage.used.value, storage.used.unit)}
            </Text>
          </Flex>
        </Col>
        <Col span={8}>
          <Flex vertical gap={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('statistics.available')}
            </Text>
            <Text strong style={{ fontSize: 15, color: GREEN }}>
              {formatUnitValue(storage.available.value, storage.available.unit)}
            </Text>
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}

/* ------------------------------------------------------------------ */
/*  System health card                                                 */
/* ------------------------------------------------------------------ */

type SystemHealth = {
  status: string;
  statusLabel: string;
  uptimePercent: number;
  lastChecked: string;
  services: { name: string; status: string; latencyMs: number }[];
};

function SystemHealthCard({ health }: { health: SystemHealth }) {
  const { t } = useTranslation();
  const overall = getHealthStatusMeta(health.status, t);

  return (
    <Flex vertical gap={16}>
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={8}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${overall.color}1a`,
              color: overall.color,
            }}
          >
            <ShieldCheck size={16} />
          </Flex>
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 13 }}>{health.statusLabel}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t('statistics.uptimeChecked', {
                uptime: health.uptimePercent,
                time: health.lastChecked,
              })}
            </Text>
          </Flex>
        </Flex>
        <Tag
          bordered={false}
          style={{
            margin: 0,
            color: overall.color,
            background: `${overall.color}1a`,
            fontWeight: 600,
          }}
        >
          {overall.label}
        </Tag>
      </Flex>

      <Flex vertical gap={10}>
        {health.services.map((s) => {
          const meta = getHealthStatusMeta(s.status, t);
          return (
            <Flex key={s.name} align="center" justify="space-between">
              <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: meta.color,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 13 }} ellipsis>
                  {s.name}
                </Text>
                {s.status !== 'healthy' && <AlertTriangle size={12} color={meta.color} />}
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {s.latencyMs} ms
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Flex>
  );
}

const ACTIVITY_META: Record<string, { color: string; icon: ReactNode }> = {
  approved: { color: GREEN, icon: <CheckCircle2 size={14} /> },
  rejected: { color: RED, icon: <XCircle size={14} /> },
  created: { color: '#6366f1', icon: <FolderKanban size={14} /> },
  evaluated: { color: '#f59e0b', icon: <MessageSquare size={14} /> },
  uploaded: { color: '#0ea5e9', icon: <ImageIcon size={14} /> },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function StatisticsPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day').startOf('day'),
    dayjs(),
  ]);

  const presetOptions = useMemo(
    () => [
      { label: t('statistics.today'), value: 'today' },
      { label: t('statistics.thisWeek'), value: 'week' },
      { label: t('statistics.thisMonth'), value: 'month' },
      { label: t('statistics.thisYear'), value: 'year' },
      { label: t('statistics.customRange'), value: 'custom' },
    ],
    [t],
  );

  const topProjectMetrics = useMemo(
    () => [
      {
        key: 'view' as const,
        label: t('statistics.metricView'),
        icon: <Eye size={13} />,
        color: '#0ea5e9',
      },
      {
        key: 'media' as const,
        label: t('statistics.metricMedia'),
        icon: <Film size={13} />,
        color: '#6366f1',
      },
      {
        key: 'size' as const,
        label: t('statistics.metricSize'),
        icon: <HardDrive size={13} />,
        color: AMBER,
      },
      {
        key: 'image' as const,
        label: t('statistics.metricImage'),
        icon: <ImageIcon size={13} />,
        color: GREEN,
      },
      {
        key: 'video' as const,
        label: t('statistics.metricVideo'),
        icon: <Film size={13} />,
        color: RED,
      },
    ],
    [t],
  );

  const {
    summary,
    projectOverview,
    mediaEvaluationResults,
    mediaTypeDistribution,
    storageStatistics,
    systemHealth,
    topProjectsBy,
  } = statsData;

  const [topMetric, setTopMetric] = useState<TopMetricKey>('media');

  const summaryCards = useMemo(
    () => [
      {
        title: t('statistics.totalProjects'),
        value: summary.totalProjects.value,
        deltaPercent: summary.totalProjects.deltaPercent,
        trend: summary.totalProjects.trend as 'up' | 'down',
        color: '#6366f1',
        icon: <FolderKanban size={20} />,
      },
      {
        title: t('statistics.totalMediaFiles'),
        value: summary.totalMediaFiles.value,
        deltaPercent: summary.totalMediaFiles.deltaPercent,
        trend: summary.totalMediaFiles.trend as 'up' | 'down',
        color: '#0ea5e9',
        icon: <Film size={20} />,
      },
      {
        title: t('statistics.pendingEvaluation'),
        value: summary.pendingEvaluation.value,
        deltaPercent: summary.pendingEvaluation.deltaPercent,
        trend: summary.pendingEvaluation.trend as 'up' | 'down',
        color: AMBER,
        icon: <Clock3 size={20} />,
      },
      {
        title: t('statistics.approvedMedia'),
        value: summary.approvedMedia.value,
        deltaPercent: summary.approvedMedia.deltaPercent,
        trend: summary.approvedMedia.trend as 'up' | 'down',
        color: GREEN,
        icon: <CheckCircle2 size={20} />,
      },
      {
        title: t('statistics.rejectedMedia'),
        value: summary.rejectedMedia.value,
        deltaPercent: summary.rejectedMedia.deltaPercent,
        trend: summary.rejectedMedia.trend as 'up' | 'down',
        color: RED,
        icon: <XCircle size={20} />,
      },
      {
        title: t('statistics.totalUser'),
        value: summary.totalUserProjects.value,
        deltaPercent: summary.totalUserProjects.deltaPercent,
        trend: summary.totalUserProjects.trend as 'up' | 'down',
        color: RED,
        icon: <User size={20} />,
      },
    ],
    [summary, t],
  );

  const chartData = useMemo(
    () =>
      projectOverview.labels.map((label, index) => ({
        label,
        projects: projectOverview.projects[index] ?? 0,
        mediaFiles: projectOverview.mediaFiles[index] ?? 0,
      })),
    [projectOverview],
  );

  const evalSegments = mediaEvaluationResults.segments as Segment[];
  const typeSegments = mediaTypeDistribution.segments as Segment[];

  const activeTopMetric = topProjectMetrics.find((m) => m.key === topMetric)!;
  const topProjectsList = (topProjectsBy[topMetric] ?? []) as {
    id: string;
    name: string;
    value: number;
    unit?: string;
  }[];
  const maxTopValue = Math.max(...topProjectsList.map((p) => p.value), 1);

  const cardStyle = {
    background: token.colorBgContainer,
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: '100%',
  };

  /* ---------------------------- table ---------------------------- */

  const columns = [
    {
      title: t('statistics.projectColumn'),
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 180,
      render: (name: string) => (
        <Flex align="center" gap={8}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#6366f11a',
              color: '#6366f1',
              flexShrink: 0,
            }}
          >
            <FolderKanban size={14} />
          </Flex>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
        </Flex>
      ),
    },
    {
      title: t('statistics.mediaColumn'),
      dataIndex: 'mediaCount',
      key: 'mediaCount',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatNumber(v)}</Text>,
    },
    {
      title: t('statistics.approvedColumn'),
      dataIndex: 'approvedPercent',
      key: 'approved',
      width: 160,
      render: (percent: number, row: RecentProject) => (
        <Flex vertical gap={4}>
          <Flex justify="space-between">
            <Text style={{ fontSize: 12 }}>{formatNumber(row.approved)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {percent}%
            </Text>
          </Flex>
          <Progress percent={percent} showInfo={false} size="small" strokeColor={GREEN} />
        </Flex>
      ),
    },
    {
      title: t('statistics.rejectedColumn'),
      dataIndex: 'rejectedPercent',
      key: 'rejected',
      width: 160,
      render: (percent: number, row: RecentProject) => (
        <Flex vertical gap={4}>
          <Flex justify="space-between">
            <Text style={{ fontSize: 12 }}>{formatNumber(row.rejected)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {percent}%
            </Text>
          </Flex>
          <Progress percent={percent} showInfo={false} size="small" strokeColor={RED} />
        </Flex>
      ),
    },
    {
      title: t('statistics.pendingColumn'),
      dataIndex: 'pendingPercent',
      key: 'pending',
      width: 140,
      render: (percent: number, row: RecentProject) => (
        <Flex vertical gap={4}>
          <Flex justify="space-between">
            <Text style={{ fontSize: 12 }}>{formatNumber(row.pending)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {percent}%
            </Text>
          </Flex>
          <Progress percent={percent} showInfo={false} size="small" strokeColor={AMBER} />
        </Flex>
      ),
    },

    {
      title: t('statistics.lastUpdatedColumn'),
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 130,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
  ];

  /* ---------------------------- render ---------------------------- */

  return (
    <PageContainer
      title={t('statistics.title')}
      subTitle={t('statistics.subtitle')}
      extra={[
        preset === 'custom' && (
          <DatePicker.RangePicker
            key="range"
            value={customRange}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) setCustomRange([values[0], values[1]]);
            }}
            allowClear={false}
            format="DD/MM/YYYY"
          />
        ),
        <Segmented
          key="preset"
          value={preset}
          onChange={(value) => setPreset(String(value))}
          options={presetOptions}
        />,
      ]}
      style={{
        background: token.colorBgLayout,
        paddingBlock: 16,
        paddingInline: 16,
      }}
    >
      {/* ---------------- Summary ---------------- */}
      <Row gutter={[16, 16]}>
        {summaryCards.map((item) => (
          <Col key={item.title} xs={24} sm={12} md={8} xl={24 / 6}>
            <SummaryCard {...item} />
          </Col>
        ))}
      </Row>

      {/* ---------------- Storage & System health ---------------- */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <ProCard
            title={t('statistics.storageStatistics')}
            bordered
            headerBordered
            style={cardStyle}
          >
            <StorageStatsCard storage={storageStatistics as StorageStats} />
          </ProCard>
        </Col>
        <Col xs={24} md={12}>
          <ProCard title={t('statistics.systemHealth')} bordered headerBordered style={cardStyle}>
            <SystemHealthCard health={systemHealth as SystemHealth} />
          </ProCard>
        </Col>
      </Row>

      {/* ---------------- Charts ---------------- */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <ProCard
            title={t('statistics.last30DaysChart')}
            bordered
            headerBordered
            style={cardStyle}
            bodyStyle={{ paddingTop: 8 }}
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMedia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={token.colorBorderSecondary}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatNumber(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="projects"
                    name={t('statistics.projectsName')}
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gradProjects)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="mediaFiles"
                    name={t('statistics.mediaFilesName')}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#gradMedia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ProCard>
        </Col>

        <Col xs={24} lg={8}>
          <ProCard
            title={t('statistics.mediaTypeDistribution')}
            bordered
            headerBordered
            style={cardStyle}
            bodyStyle={{ paddingTop: 8 }}
          >
            <DonutChart
              segments={typeSegments}
              centerLabel={t('statistics.totalFiles')}
              height={220}
            />
            <div style={{ marginTop: 16 }}>
              <SegmentLegend segments={typeSegments} total={mediaTypeDistribution.total} />
            </div>
          </ProCard>
        </Col>
      </Row>

      {/* ---------------- Row 3 ---------------- */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Media type distribution */}
        <Col xs={24} lg={8}>
          <ProCard
            title={t('statistics.mediaEvaluationResults')}
            bordered
            headerBordered
            style={cardStyle}
            bodyStyle={{ paddingTop: 8 }}
          >
            <DonutChart
              segments={evalSegments}
              centerLabel={t('statistics.totalMedia')}
              height={220}
            />
            <div style={{ marginTop: 16 }}>
              <SegmentLegend segments={evalSegments} total={mediaEvaluationResults.total} />
            </div>
          </ProCard>
        </Col>

        {/* Top projects by */}
        <Col xs={24} lg={8}>
          <ProCard
            title={t('statistics.topProjectsBy')}
            bordered
            headerBordered
            style={cardStyle}
            extra={
              <Segmented
                size="small"
                value={topMetric}
                onChange={(value) => setTopMetric(value as TopMetricKey)}
                options={topProjectMetrics.map((m) => ({
                  label: (
                    <Flex align="center" gap={4}>
                      {m.icon}
                      {m.label}
                    </Flex>
                  ),
                  value: m.key,
                }))}
              />
            }
          >
            <Flex vertical gap={18}>
              {topProjectsList.map((p, index) => (
                <Flex key={p.id} vertical gap={6}>
                  <Flex align="center" justify="space-between" gap={8}>
                    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                      <Flex
                        align="center"
                        justify="center"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          color: index < 3 ? '#fff' : token.colorTextSecondary,
                          background: index < 3 ? activeTopMetric.color : token.colorFillSecondary,
                        }}
                      >
                        {index + 1}
                      </Flex>
                      <Text style={{ fontSize: 13 }} ellipsis>
                        {p.name}
                      </Text>
                    </Flex>
                    <Text strong style={{ fontSize: 13 }}>
                      {p.unit ? formatUnitValue(p.value, p.unit) : formatNumber(p.value)}
                    </Text>
                  </Flex>
                  <Progress
                    percent={(p.value / maxTopValue) * 100}
                    showInfo={false}
                    size="small"
                    strokeColor={activeTopMetric.color}
                  />
                </Flex>
              ))}
            </Flex>
          </ProCard>
        </Col>

        {/* Recent activities */}
        <Col xs={24} lg={8}>
          <ProCard
            title={t('statistics.recentActivities')}
            bordered
            headerBordered
            style={cardStyle}
          >
            <Timeline
              items={statsData.recentActivities.map((a) => {
                const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.created;
                return {
                  dot: (
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: `${meta.color}1a`,
                        color: meta.color,
                      }}
                    >
                      {meta.icon}
                    </Flex>
                  ),
                  children: (
                    <Flex vertical gap={2} style={{ paddingBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{a.text}</Text>
                      <Flex align="center" gap={8}>
                        <Tag
                          bordered={false}
                          style={{
                            fontSize: 11,
                            margin: 0,
                            color: meta.color,
                            background: `${meta.color}1a`,
                          }}
                        >
                          {a.project}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {a.time}
                        </Text>
                      </Flex>
                    </Flex>
                  ),
                };
              })}
            />
          </ProCard>
        </Col>
      </Row>

      {/* ---------------- Table ---------------- */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ProCard title={t('statistics.recentProjects')} bordered headerBordered style={cardStyle}>
            <Table
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={statsData.recentProjects}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
