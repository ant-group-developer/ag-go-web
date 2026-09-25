import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Slider,
  Spin,
  Switch,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import { ImagePlus, RotateCcw, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getRenderProfiles,
  getWatermarkLogoUrl,
  rerenderWatermark,
  uploadWatermarkLogo,
  WATERMARK_POSITIONS,
  type RenderProfile,
} from '../../render/api/render';
import { useUpdateRenderProfile } from '../../render/hooks/use-render';
import {
  isValidPreviewWidth,
  normalizePreviewWidths,
  normalizeRenderSizes,
  PREVIEW_WIDTH_MAX,
  PREVIEW_WIDTH_MIN,
  PREVIEW_WIDTHS_MAX_COUNT,
  THUMBNAIL_WIDTH_MAX,
  THUMBNAIL_WIDTH_MIN,
} from '../../render/utils/render-sizes';
import { normalizeWatermarkConfig } from '../../render/utils/watermark-config';
import { WatermarkPreview } from '../components/watermark-preview';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';

function RenderProfileEditor({
  profile,
  onSuccess,
}: {
  profile: RenderProfile;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { message, modal } = AntApp.useApp();
  const updateProfile = useUpdateRenderProfile();
  const [logoUrl, setLogoUrl] = useState<string>();
  const [sampleUrl, setSampleUrl] = useState<string>();
  const [logoUploading, setLogoUploading] = useState(false);
  const config = normalizeWatermarkConfig(Form.useWatch('watermarkConfig', form));
  const watermarkEnabled = Boolean(Form.useWatch('watermarkEnabled', form));

  useEffect(() => {
    const logoAssetId = profile.watermarkConfig?.logoAssetId;
    if (!logoAssetId) {
      setLogoUrl(undefined);
      return undefined;
    }
    let disposed = false;
    void getWatermarkLogoUrl(logoAssetId)
      .then((url) => {
        if (!disposed) {
          setLogoUrl(url);
        }
      })
      .catch(() => setLogoUrl(undefined));
    return () => {
      disposed = true;
    };
  }, [profile.watermarkConfig?.logoAssetId]);

  useEffect(
    () => () => {
      if (sampleUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(sampleUrl);
      }
    },
    [sampleUrl],
  );

  const applyToExistingMedia = async () => {
    try {
      const result = await rerenderWatermark({ scope: 'FILTER', mediaType: 'ALL' });
      void message.success(
        result.enqueuedJobs > 0
          ? t('settings.applyToExistingSuccess', {
              enqueued: result.enqueuedJobs,
              matched: result.matchedMedia,
            })
          : t('settings.applyToExistingNothing'),
      );
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : t('settings.applyToExistingFailed'),
      );
    }
  };

  const confirmApplyToExistingMedia = () => {
    modal.confirm({
      title: t('settings.applyToExistingTitle'),
      content: t('settings.applyToExistingContent'),
      okText: t('settings.applyToExistingOk'),
      cancelText: t('settings.applyToExistingLater'),
      onOk: applyToExistingMedia,
    });
  };

  const handleLogoUpload = async (file: RcFile) => {
    setLogoUploading(true);
    try {
      const assetId = await uploadWatermarkLogo(file);
      form.setFieldValue(['watermarkConfig', 'logoAssetId'], assetId);
      setLogoUrl(URL.createObjectURL(file));
      void message.success(t('settings.logoUploadSuccess'));
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('settings.logoUploadFailed'));
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Card title={`${profile.name} · v${profile.profileVersion}`} style={{ marginTop: 16 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: profile.name,
          renderSizes: normalizeRenderSizes(profile.renderSizes ?? { previewWidths: [] }),
          imageQuality: profile.imageQuality,
          videoBitrateBps: profile.videoBitrateBps ?? '',
          watermarkEnabled: profile.watermarkEnabled,
          watermarkConfig: normalizeWatermarkConfig(profile.watermarkConfig),
        }}
        onFinish={(values) => {
          updateProfile.mutate(
            {
              id: profile.id,
              input: {
                name: values.name,
                renderSizes: {
                  previewWidths: normalizePreviewWidths(values.renderSizes?.previewWidths),
                  thumbnailWidth: values.renderSizes?.thumbnailWidth,
                },
                imageQuality: values.imageQuality,
                videoBitrateBps: values.videoBitrateBps || null,
                watermarkEnabled: values.watermarkEnabled,
                watermarkConfig: normalizeWatermarkConfig(values.watermarkConfig),
              },
            },
            {
              onSuccess: () => {
                void message.success(t('settings.profileUpdateSuccess'));
                onSuccess();
                confirmApplyToExistingMedia();
              },
              onError: (error) =>
                void message.error(
                  error instanceof Error ? error.message : t('settings.profileUpdateFailed'),
                ),
            },
          );
        }}
      >
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} lg={14}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label={t('settings.profileName')}
                  rules={[{ required: true }]}
                >
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="imageQuality" label={t('settings.imageQuality')}>
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="videoBitrateBps" label={t('settings.videoBitrate')}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Card size="small" title={t('settings.renderSizes')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name={['renderSizes', 'previewWidths']}
                    label={t('settings.previewWidths')}
                    extra={t('settings.previewWidthsHint')}
                    rules={[
                      {
                        validator: (_, value: unknown[] = []) => {
                          if (value.length === 0) {
                            return Promise.reject(new Error(t('settings.previewWidthsRequired')));
                          }
                          if (!value.every(isValidPreviewWidth)) {
                            return Promise.reject(
                              new Error(
                                t('settings.previewWidthsInvalid', {
                                  min: PREVIEW_WIDTH_MIN,
                                  max: PREVIEW_WIDTH_MAX,
                                }),
                              ),
                            );
                          }
                          if (new Set(value.map(Number)).size > PREVIEW_WIDTHS_MAX_COUNT) {
                            return Promise.reject(
                              new Error(
                                t('settings.previewWidthsTooMany', {
                                  count: PREVIEW_WIDTHS_MAX_COUNT,
                                }),
                              ),
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                    normalize={(value: unknown[]) =>
                      value.every(isValidPreviewWidth) ? normalizePreviewWidths(value) : value
                    }
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',', ' ']}
                      placeholder="480, 960, 1920"
                      suffixIcon={<span>px</span>}
                      options={[360, 480, 720, 960, 1280, 1920, 2560, 3840].map((width) => ({
                        value: width,
                        label: `${width}px`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name={['renderSizes', 'thumbnailWidth']}
                    label={t('settings.thumbnailWidth')}
                    extra={t('settings.thumbnailWidthHint')}
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      min={THUMBNAIL_WIDTH_MIN}
                      max={THUMBNAIL_WIDTH_MAX}
                      precision={0}
                      addonAfter="px"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card size="small" title={t('settings.watermark')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="watermarkEnabled"
                    label={t('settings.watermarkEnabled')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={18}>
                  <Form.Item name={['watermarkConfig', 'text']} label={t('settings.text')}>
                    <Input maxLength={200} placeholder="AG Go Preview" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name={['watermarkConfig', 'color']} label={t('settings.textColor')}>
                    <Input type="color" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name={['watermarkConfig', 'fontFamily']} label={t('settings.font')}>
                    <Select
                      options={[
                        'Arial',
                        'Times New Roman',
                        'Courier New',
                        'Verdana',
                        'Georgia',
                        'Impact',
                        'Tahoma',
                      ].map((value) => ({ value, label: value }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8} hidden={!config.repeat}>
                  <Form.Item
                    name={['watermarkConfig', 'fontSize']}
                    label={t('settings.fontSize')}
                    tooltip={t('settings.fontSizeRepeatHint')}
                  >
                    <InputNumber min={8} max={240} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item name={['watermarkConfig', 'rotate']} label={t('settings.rotate')}>
                    <InputNumber min={-360} max={360} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label={t('settings.logo')}>
                    <Upload
                      accept="image/png,image/jpeg,image/webp"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        void handleLogoUpload(file);
                        return false;
                      }}
                    >
                      <Button icon={<UploadCloud size={16} />} loading={logoUploading}>
                        {t('settings.uploadLogo')}
                      </Button>
                    </Upload>
                    {logoUrl ? (
                      <div style={{ marginTop: 8 }}>
                        <Image
                          src={logoUrl}
                          width={96}
                          height={48}
                          style={{ objectFit: 'contain' }}
                        />
                        <Button
                          type="link"
                          danger
                          icon={<RotateCcw size={14} />}
                          onClick={() => {
                            form.setFieldValue(['watermarkConfig', 'logoAssetId'], null);
                            setLogoUrl(undefined);
                          }}
                        >
                          {t('settings.deleteLogo')}
                        </Button>
                      </div>
                    ) : null}
                  </Form.Item>
                  <Form.Item name={['watermarkConfig', 'logoAssetId']} hidden>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name={['watermarkConfig', 'position']} label={t('settings.position')}>
                    <Select
                      options={WATERMARK_POSITIONS.map((value) => ({ value, label: value }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name={['watermarkConfig', 'repeat']}
                    label={t('settings.repeatWatermark')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6} hidden={!config.repeat}>
                  <Form.Item name={['watermarkConfig', 'gapX']} label={t('settings.gapX')}>
                    <InputNumber min={40} max={2000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6} hidden={!config.repeat}>
                  <Form.Item name={['watermarkConfig', 'gapY']} label={t('settings.gapY')}>
                    <InputNumber min={40} max={2000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name={['watermarkConfig', 'opacity']} label={t('settings.opacity')}>
                    <Slider min={0} max={1} step={0.05} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} hidden={config.repeat}>
                  <Form.Item
                    name={['watermarkConfig', 'scale']}
                    label={t('settings.watermarkSize')}
                    tooltip={t('settings.watermarkSizeHint')}
                  >
                    <Slider min={0.05} max={1} step={0.01} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name={['watermarkConfig', 'margin']} label={t('settings.margin')}>
                    <InputNumber min={0} max={500} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card size="small" title="Preview watermark" style={{ position: 'sticky', top: 16 }}>
              <Flex vertical gap={16}>
                <Flex align="center" justify="flex-start" gap={16}>
                  <Typography.Text type="secondary">{t('settings.previewSample')}</Typography.Text>

                  <Upload
                    accept="image/*"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (sampleUrl?.startsWith('blob:')) {
                        URL.revokeObjectURL(sampleUrl);
                      }

                      setSampleUrl(URL.createObjectURL(file));
                      return false;
                    }}
                  >
                    <Button icon={<ImagePlus size={16} />} style={{ margin: '8px 0 12px' }}>
                      {t('settings.selectSample')}
                    </Button>
                  </Upload>
                </Flex>

                <WatermarkPreview
                  sampleUrl={sampleUrl}
                  logoUrl={logoUrl}
                  config={config}
                  enabled={watermarkEnabled}
                />
                <Typography.Text type="secondary">{t('settings.previewNote')}</Typography.Text>
              </Flex>
            </Card>
          </Col>
        </Row>

        <Flex gap={8} wrap>
          <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
            {t('settings.saveProfile')}
          </Button>
          <Button onClick={confirmApplyToExistingMedia}>{t('settings.applyToExisting')}</Button>
        </Flex>
      </Form>
    </Card>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
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

  const profileCards = profiles.data?.map((profile) => (
    <RenderProfileEditor
      key={profile.id}
      profile={profile}
      onSuccess={() => void profiles.refetch()}
    />
  ));

  return (
    <PageContainer title={t('settings.title')}>
      {settings.isError ? <Alert type="error" showIcon message={settings.error.message} /> : null}
      {settings.isLoading ? <Spin /> : null}
      <Tabs
        items={[
          {
            key: 'web',
            label: t('settings.tabWebsite'),
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={(values) => {
                    update.mutate(values);
                  }}
                >
                  <Form.Item
                    name="siteName"
                    label={t('settings.siteName')}
                    rules={[{ required: true }]}
                  >
                    <Input maxLength={160} />
                  </Form.Item>
                  <Form.Item name="siteDescription" label={t('settings.siteDescription')}>
                    <Input.TextArea maxLength={300} rows={3} />
                  </Form.Item>
                  <Form.Item name="logoUrl" label={t('settings.logoUrl')}>
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="faviconUrl" label={t('settings.faviconUrl')}>
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="supportEmail" label={t('settings.supportEmail')}>
                    <Input type="email" />
                  </Form.Item>
                  <Form.Item name="supportUrl" label={t('settings.supportUrl')}>
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="primaryColor" label={t('settings.primaryColor')}>
                    <Input placeholder="#1677ff" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={update.isPending}>
                    {t('settings.saveSettings')}
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'render',
            label: t('settings.tabRender'),
            children: (
              <Card>
                <Typography.Paragraph type="secondary">
                  {t('settings.renderProfileNote')}
                </Typography.Paragraph>
                {profiles.isError ? <Alert type="error" message={profiles.error.message} /> : null}
                {profiles.isLoading ? <Spin /> : null}
                {profileCards}
              </Card>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
