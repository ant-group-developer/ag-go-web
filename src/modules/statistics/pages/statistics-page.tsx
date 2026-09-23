import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Alert, Col, DatePicker, Empty, Flex, Row, Segmented, Spin, theme } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  Bar,
  BarChart,
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
import {
  Ban,
  CheckCircle2,
  Clock3,
  Film,
  FolderKanban,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Timer,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useRenderingStatistics, useStatisticsOverview } from '../hooks/use-statistics';
import { useTranslation } from 'react-i18next';

const PRESET_OPTIONS = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
  { label: 'Năm nay', value: 'year' },
  { label: 'Tùy chọn', value: 'custom' },
];

const EVAL_COLORS = { pending: '#e6a930d5', approved: '#52c41a', rejected: '#ff4d4f' };
const EVAL_LABELS = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const RENDER_COLORS: Record<string, string> = {
  Queued: '#8c8c8c',
  Processing: '#1677ff',
  Completed: '#52c41a',
  Failed: '#ff4d4f',
  Cancelled: '#d9d9d9',
};

function formatBytes(value: number | string | undefined | null) {
  const bytes = Number(value ?? 0);
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

type StatBoxItem = {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
};

export function StatisticsPage() {
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day').startOf('day'),
    dayjs(),
  ]);
  const { token } = theme.useToken();
  const { t } = useTranslation();

  const range = useMemo(() => {
    const now = dayjs();
    switch (preset) {
      case 'week':
        return { from: now.startOf('week').toISOString(), to: now.toISOString() };
      case 'month':
        return { from: now.startOf('month').toISOString(), to: now.toISOString() };
      case 'year':
        return { from: now.startOf('year').toISOString(), to: now.toISOString() };
      case 'custom':
        return {
          from: customRange[0].startOf('day').toISOString(),
          to: customRange[1].endOf('day').toISOString(),
        };
      case 'today':
      default:
        return { from: now.startOf('day').toISOString(), to: now.toISOString() };
    }
  }, [preset, customRange]);

  const overview = useStatisticsOverview(range);
  const rendering = useRenderingStatistics(range);
  const sectionCardStyle = { background: token.colorFillAlter, height: '100%' };

  const StatBox = ({ title, value, icon }: StatBoxItem) => (
    <Flex
      align="center"
      gap={12}
      style={{
        padding: 12,
        borderRadius: 8,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        height: '100%',
      }}
    >
      {icon && (
        <Flex
          align="center"
          justify="center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            flexShrink: 0,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {icon}
        </Flex>
      )}
      <Flex vertical>
        <span style={{ fontSize: 14 }}>{title}</span>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{value}</span>
      </Flex>
    </Flex>
  );

  const StatGrid = ({ items }: { items: StatBoxItem[] }) => (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.title} xs={24} sm={12} >
          <StatBox {...item} />
        </Col>
      ))}
    </Row>
  );

  if (overview.isLoading || rendering.isLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 320 }}>
        <Spin size="large" />
      </Flex>
    );
  }
  if (overview.isError || rendering.isError) {
    return (
      <PageContainer title="Thống kê">
        <Alert type="error" showIcon message="Không thể tải dữ liệu thống kê" />
      </PageContainer>
    );
  }
  if (!overview.data || !rendering.data) {
    return <Empty description="Chưa có dữ liệu" style={{ marginTop: 64 }} />;
  }

  const { evaluation } = overview.data;
  const evalTotal = evaluation.pending + evaluation.approved + evaluation.rejected;
  const evalData = (['pending', 'approved', 'rejected'] as const).map((key) => ({
    key,
    type: EVAL_LABELS[key],
    value: evaluation[key],
  }));

  const overviewItems: StatBoxItem[] = [
    {
      title: 'Projects',
      value: overview.data.projects,
      icon: <FolderKanban size={20} color="#1677ff" />,
    },
    {
      title: 'Assets',
      value: overview.data.assets,
      icon: <ImageIcon size={20} color="#722ed1" />,
    },
    {
      title: 'Media',
      value: overview.data.media,
      icon: <Film size={20} color="#eb2f96" />,
    },
    {
      title: 'Dung lượng gốc',
      value: formatBytes(overview.data.originalBytes),
      icon: <HardDrive size={20} color="#13c2c2" />,
    },
  ];

  const evaluationItems: StatBoxItem[] = [
    { title: 'Tổng đánh giá', value: evalTotal, icon: <MessageSquare size={18} color={EVAL_COLORS.pending} /> },
    {
      title: 'Chờ duyệt',
      value: evaluation.pending,
      icon: <Clock3 size={18} color={EVAL_COLORS.pending} />,
    },
    {
      title: 'Đã duyệt',
      value: evaluation.approved,
      icon: <CheckCircle2 size={18} color={EVAL_COLORS.approved} />,
    },
    {
      title: 'Từ chối',
      value: evaluation.rejected,
      icon: <XCircle size={18} color={EVAL_COLORS.rejected} />,
    },
  ];

  const renderData = [
    { status: 'Queued', label: 'Đang chờ', count: rendering.data.queued },
    { status: 'Processing', label: 'Đang xử lý', count: rendering.data.processing },
    { status: 'Completed', label: 'Hoàn tất', count: rendering.data.completed },
    { status: 'Failed', label: 'Thất bại', count: rendering.data.failed },
    { status: 'Cancelled', label: 'Đã hủy', count: rendering.data.cancelled },
  ];

  return (
    <PageContainer
      title={t('statistics.title')}
      extra={[
        preset === 'custom' && (
          <DatePicker.RangePicker
            key="range"
            value={customRange}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) {
                setCustomRange([values[0], values[1]]);
              }
            }}
            allowClear={false}
            format="DD/MM/YYYY"
          />
        ),
        <Segmented
          key="preset"
          value={preset}
          onChange={(value) => setPreset(String(value))}
          options={PRESET_OPTIONS}
        />,
      ]}
      style={{
        background: token.colorBgContainer,
        paddingBlock: 16,
        paddingInline: 16,
        borderRadius: 6,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ProCard
            title="Tổng quan"
            bordered
            headerBordered
            style={sectionCardStyle}
            bodyStyle={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StatGrid items={overviewItems} />
          </ProCard>
        </Col>

        <Col xs={24} lg={16}>
          <ProCard title="Evaluation" bordered headerBordered style={sectionCardStyle}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={evalData}
                        dataKey="value"
                        nameKey="type"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ value }) => value}
                      >
                        {evalData.map((d) => (
                          <Cell key={d.key} fill={EVAL_COLORS[d.key]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Col>

              <Col xs={24} md={12}>
                <StatGrid items={evaluationItems} />
              </Col>
            </Row>
          </ProCard>
        </Col>
      </Row>

      <ProCard title="Rendering" bordered headerBordered style={{ background: token.colorFillAlter, marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={renderData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {renderData.map((d) => (
                      <Cell key={d.status} fill={RENDER_COLORS[d.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8} lg={24}>
                <StatisticCard
                  statistic={{
                    title: 'Đang xử lý',
                    value: rendering.data.processing,
                    icon: <Loader2 size={20} color={RENDER_COLORS.Processing} />,
                  }}
                />
              </Col>
              <Col xs={24} sm={8} lg={24}>
                <StatisticCard
                  statistic={{
                    title: 'Đã hủy',
                    value: rendering.data.cancelled,
                    icon: <Ban size={20} color="#8c8c8c" />,
                  }}
                />
              </Col>
              <Col xs={24} sm={8} lg={24}>
                <StatisticCard
                  statistic={{
                    title: 'Thời gian render TB',
                    value: rendering.data.averageRenderSeconds,
                    precision: 2,
                    suffix: 's',
                    icon: <Timer size={20} color="#fa8c16" />,
                  }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </ProCard>
    </PageContainer>
  );
}