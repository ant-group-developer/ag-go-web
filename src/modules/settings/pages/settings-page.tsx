import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import { useEffect } from 'react';
import { getRenderProfiles } from '../../render/api/render';
import { useUpdateRenderProfile } from '../../render/hooks/use-render';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';

export function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const updateProfile = useUpdateRenderProfile();
  const { message } = AntApp.useApp();
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
                  <Form.Item name="siteDescription" label="Mô tả website">
                    <Input.TextArea maxLength={300} rows={3} />
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
                  Mỗi lần lưu sẽ tạo một version mới. Các render job đang chạy vẫn giữ version cũ,
                  còn batch mới sẽ dùng version mới nhất.
                </Typography.Paragraph>
                {profiles.isError ? (
                  <Alert type="error" message={profiles.error.message} />
                ) : null}
                {profiles.isLoading ? <Spin /> : null}
                {profiles.data?.map((profile) => (
                  <Card key={profile.id} title={`${profile.name} · v${profile.profileVersion}`} style={{ marginTop: 16 }}>
                    <Form
                      layout="vertical"
                      initialValues={{
                        name: profile.name,
                        outputFormat: profile.outputFormat,
                        maxWidth: profile.maxWidth,
                        maxHeight: profile.maxHeight,
                        imageQuality: profile.imageQuality,
                        videoBitrateBps: profile.videoBitrateBps ?? '',
                        watermarkEnabled: profile.watermarkEnabled,
                        watermarkConfig: JSON.stringify(profile.watermarkConfig ?? {}, null, 2),
                      }}
                      onFinish={(values) => {
                        let watermarkConfig: Record<string, unknown>;
                        try {
                          watermarkConfig = JSON.parse(values.watermarkConfig || '{}') as Record<
                            string,
                            unknown
                          >;
                        } catch {
                          void message.error('Watermark config phải là JSON hợp lệ');
                          return;
                        }
                        updateProfile.mutate(
                          {
                            id: profile.id,
                            input: {
                              name: values.name,
                              outputFormat: values.outputFormat,
                              maxWidth: values.maxWidth ?? null,
                              maxHeight: values.maxHeight ?? null,
                              imageQuality: values.imageQuality,
                              videoBitrateBps: values.videoBitrateBps || null,
                              watermarkEnabled: values.watermarkEnabled,
                              watermarkConfig,
                            },
                          },
                          {
                            onSuccess: () => void message.success('Đã cập nhật render profile'),
                            onError: (error) =>
                              void message.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Không thể cập nhật render profile',
                              ),
                          },
                        );
                      }}
                    >
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item name="name" label="Tên profile" rules={[{ required: true }]}>
                            <Input maxLength={100} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="outputFormat" label="Output format">
                            <Select
                              options={['webp', 'jpeg', 'jpg', 'png', 'mp4', 'webm'].map((value) => ({
                                label: value,
                                value,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item name="maxWidth" label="Max width">
                            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item name="maxHeight" label="Max height">
                            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item name="imageQuality" label="Image quality">
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item name="videoBitrateBps" label="Video bitrate (bps)">
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="watermarkEnabled"
                            label="Watermark"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="watermarkConfig"
                            label="Watermark config (JSON)"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea rows={4} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
                        Lưu render profile
                      </Button>
                    </Form>
                  </Card>
                ))}
              </Card>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
