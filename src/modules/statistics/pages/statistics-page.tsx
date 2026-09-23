import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { Alert, Empty, Flex, Segmented, Spin, Typography } from 'antd';
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
  Timer,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRenderingStatistics, useStatisticsOverview } from '../hooks/use-statistics';

const { Statistic } = StatisticCard;

const PRESET_OPTIONS = [
  { label: 'Hôm nay', value: 'today' },
  { label: '7 ngày', value: '7' },
  { label: '30 ngày', value: '30' },
  { label: '90 ngày', value: '90' },
  { label: 'Tất cả', value: 'all' },
];

const EVAL_COLORS = { pending: '#faad14', approved: '#52c41a', rejected: '#ff4d4f' };
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

export function StatisticsPage() {
  const [preset, setPreset] = useState('30');
  const range = useMemo(() => {
    if (preset === 'all') return {};
    const days = preset === 'today' ? 1 : Number.parseInt(preset, 10);
    const to = new Date();
    const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [preset]);
  const overview = useStatisticsOverview(range);
  const rendering = useRenderingStatistics(range);

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

  const renderData = [
    { status: 'Queued', label: 'Đang chờ', count: rendering.data.queued },
    { status: 'Processing', label: 'Đang xử lý', count: rendering.data.processing },
    { status: 'Completed', label: 'Hoàn tất', count: rendering.data.completed },
    { status: 'Failed', label: 'Thất bại', count: rendering.data.failed },
    { status: 'Cancelled', label: 'Đã hủy', count: rendering.data.cancelled },
  ];

  return (
    <PageContainer title="Thống kê">
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 20 }}>
        <Typography.Text type="secondary">Khoảng thời gian</Typography.Text>
        <Segmented
          value={preset}
          onChange={(value) => setPreset(String(value))}
          options={PRESET_OPTIONS}
        />
      </Flex>

      <Typography.Title level={4}>Tổng quan</Typography.Title>
      <StatisticCard.Group direction="row" style={{ marginBottom: 24 }} bordered>
        <StatisticCard
          statistic={{
            title: 'Projects',
            value: overview.data.projects,
            icon: <FolderKanban size={20} color="#1677ff" />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Assets',
            value: overview.data.assets,
            icon: <ImageIcon size={20} color="#722ed1" />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Media',
            value: overview.data.media,
            icon: <Film size={20} color="#eb2f96" />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Dung lượng gốc',
            value: formatBytes(overview.data.originalBytes),
            icon: <HardDrive size={20} color="#13c2c2" />,
          }}
        />
      </StatisticCard.Group>

      <Typography.Title level={4}>Evaluation</Typography.Title>
      <StatisticCard.Group direction="row" style={{ marginBottom: 24 }}>
        <StatisticCard
          colSpan={{ xs: 24, md: 10 }}
          statistic={{ title: 'Tổng lượt đánh giá', value: evalTotal }}
          chart={
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
          }
        />
        <StatisticCard.Divider />
        <StatisticCard
          colSpan={{ xs: 24, md: 14 }}
          statistic={{
            title: 'Chờ duyệt',
            value: evaluation.pending,
            icon: <Clock3 size={20} color={EVAL_COLORS.pending} />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Đã duyệt',
            value: evaluation.approved,
            icon: <CheckCircle2 size={20} color={EVAL_COLORS.approved} />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Từ chối',
            value: evaluation.rejected,
            icon: <XCircle size={20} color={EVAL_COLORS.rejected} />,
          }}
        />
      </StatisticCard.Group>

      <Typography.Title level={4}>Rendering</Typography.Title>
      <StatisticCard.Group direction="row" bordered>
        <StatisticCard
          colSpan={{ xs: 24, md: 16 }}
          chart={
            <div style={{ width: '100%', height: 240 }}>
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
          }
        />
        <StatisticCard.Divider />
        <StatisticCard
          colSpan={{ xs: 24, md: 8 }}
          statistic={{
            title: 'Đang xử lý',
            value: rendering.data.processing,
            icon: <Loader2 size={20} color={RENDER_COLORS.Processing} />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Đã hủy',
            value: rendering.data.cancelled,
            icon: <Ban size={20} color="#8c8c8c" />,
          }}
        />
        <StatisticCard.Divider />
        <StatisticCard
          statistic={{
            title: 'Thời gian render TB',
            value: rendering.data.averageRenderSeconds,
            precision: 2,
            suffix: 's',
            icon: <Timer size={20} color="#fa8c16" />,
          }}
        />
      </StatisticCard.Group>
    </PageContainer>
  );
}