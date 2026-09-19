import { Card, Col, Row, Typography } from 'antd';

export function HomePage() {
  return (
    <>
      <Typography.Title level={2}>AG Go workspace</Typography.Title>
      <Typography.Paragraph>
        Frontend shell đã sẵn sàng. Các module nghiệp vụ sẽ được triển khai theo implementation
        plan.
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Repositories">ag-go-web + ag-go-api</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="UI">Ant Design + React Router</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Server state">TanStack Query</Card>
        </Col>
      </Row>
    </>
  );
}
