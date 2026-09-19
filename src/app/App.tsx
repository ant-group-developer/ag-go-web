import { Layout, Menu, Space, Tag, Typography } from 'antd';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { HealthPage } from '../modules/system/pages/HealthPage';
import { HomePage } from '../modules/system/pages/HomePage';

const menuItems = [
  { key: '/', label: <Link to="/">Tổng quan</Link> },
  { key: '/health', label: <Link to="/health">API health</Link> },
];

export function App() {
  const location = useLocation();

  return (
    <Layout className="app-shell">
      <Layout.Header className="app-header">
        <Space size="middle">
          <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
            AG Go
          </Typography.Title>
          <Tag color="blue">Phase 0</Tag>
        </Space>
      </Layout.Header>
      <Layout>
        <Layout.Sider width={220} theme="light">
          <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
        </Layout.Sider>
        <Layout.Content className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
