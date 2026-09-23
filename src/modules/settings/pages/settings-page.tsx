import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, Spin, Tabs, Typography } from 'antd';
import { useEffect } from 'react';
import { getRenderProfiles } from '../../render/api/render';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';

export function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const profiles = useQuery({
    queryKey: ['render', 'profiles'],
    queryFn: getRenderProfiles,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    if (settings.data) {
      form.setFieldsValue(settings.data);
    }
  }, [form, settings.data]);

  return (
    <PageContainer title="Cấu hình hệ thống">
      {settings.isError ? <Alert type="error" showIcon message={settings.error.message} /> : null}
      {settings.isLoading ? <Spin /> : null}
      <Tabs
        items={[
          {
            key: 'web',
            label: 'Thông tin website',
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={(values) => {
                    update.mutate(values);
                  }}
                >
                  <Form.Item name="siteName" label="Tên website" rules={[{ required: true }]}>
                    <Input maxLength={160} />
                  </Form.Item>
                  <Form.Item name="logoUrl" label="Logo URL">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="faviconUrl" label="Favicon URL">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="supportEmail" label="Email hỗ trợ">
                    <Input type="email" />
                  </Form.Item>
                  <Form.Item name="supportUrl" label="Trang hỗ trợ">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="primaryColor" label="Màu chủ đạo">
                    <Input placeholder="#1677ff" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={update.isPending}>
                    Lưu cấu hình
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'render',
            label: 'Render profiles',
            children: (
              <Card>
                <Typography.Paragraph type="secondary">
                  Render profile mặc định là immutable trong phase hiện tại. Có thể xem cấu hình
                  đang áp dụng; việc chỉnh sửa profile sẽ được mở ở phase sau.
                </Typography.Paragraph>
                {profiles.isError ? (
                  <Alert type="error" message={profiles.error.message} />
                ) : null}
                {profiles.isLoading ? <Spin /> : null}
                {profiles.data?.map((profile) => (
                  <Card.Grid key={profile.id} hoverable={false} style={{ width: '100%' }}>
                    <Typography.Text strong>{profile.name}</Typography.Text>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {profile.outputFormat} · v{profile.profileVersion} ·{' '}
                      {profile.watermarkEnabled ? 'Watermark bật' : 'Watermark tắt'}
                    </Typography.Paragraph>
                  </Card.Grid>
                ))}
              </Card>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
