import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Card,
  Col,
  Empty,
  Flex,
  Progress,
  Row,
  Segmented,
  Spin,
  Statistic,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useRenderingStatistics, useStatisticsOverview } from '../hooks/use-statistics';

export function StatisticsPage() {
  const [preset, setPreset] = useState('30d');
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
    return <Spin />;
  }
  if (overview.isError || rendering.isError) {
    return (
      <PageContainer title="Thống kê">
        <Alert type="error" showIcon message="Không thể tải dữ liệu thống kê" />;
      </PageContainer>
    );
  }
  if (!overview.data || !rendering.data) {
    return <Empty />;
  }

  return (
    <PageContainer title="Thống kê">
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">Khoảng thời gian</Typography.Text>
        <Segmented
          value={preset}
          onChange={(value) => setPreset(String(value))}
          options={[
            { label: 'Hôm nay', value: 'today' },
            { label: '7 ngày', value: '7' },
            { label: '30 ngày', value: '30' },
            { label: '90 ngày', value: '90' },
            { label: 'Tất cả', value: 'all' },
          ]}
        />
      </Flex>
      <Typography.Title level={4}>Tổng quan</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Projects" value={overview.data.projects} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Assets" value={overview.data.assets} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Media" value={overview.data.media} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Original bytes" value={overview.data.originalBytes} />
          </Card>
        </Col>
      </Row>
      <Typography.Title level={4} style={{ marginTop: 24 }}>
        Evaluation
      </Typography.Title>
      <Card title="Tỷ lệ đánh giá" style={{ marginBottom: 16 }}>
        {(['pending', 'approved', 'rejected'] as const).map((key) => {
          const total =
            overview.data.evaluation.pending +
            overview.data.evaluation.approved +
            overview.data.evaluation.rejected;
          const value = overview.data.evaluation[key];
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <Typography.Text>{key}</Typography.Text>
              <Progress
                percent={total ? Math.round((value / total) * 100) : 0}
                format={() => `${value}`}
                status={key === 'rejected' ? 'exception' : key === 'approved' ? 'success' : 'active'}
              />
            </div>
          );
        })}
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Pending" value={overview.data.evaluation.pending} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Approved" value={overview.data.evaluation.approved} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Rejected" value={overview.data.evaluation.rejected} />
          </Card>
        </Col>
      </Row>
      <Typography.Title level={4} style={{ marginTop: 24 }}>
        Rendering
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic title="Queued" value={rendering.data.queued} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic title="Processing" value={rendering.data.processing} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic title="Completed" value={rendering.data.completed} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic title="Failed" value={rendering.data.failed} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic title="Cancelled" value={rendering.data.cancelled} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Avg. seconds"
              value={rendering.data.averageRenderSeconds}
              precision={2}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
