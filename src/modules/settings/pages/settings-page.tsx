import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
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
import { useEffect, useRef, useState } from 'react';
import { getAssetPreviewUrl } from '../../media/api/media';
import {
  getRenderProfiles,
  type RenderProfile,
  type WatermarkConfig,
  uploadWatermarkLogo,
  WATERMARK_POSITIONS,
} from '../../render/api/render';
import { useUpdateRenderProfile } from '../../render/hooks/use-render';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  text: 'AG Go Preview',
  logoAssetId: null,
  color: '#FFFFFF',
  fontFamily: 'Arial',
  fontSize: 24,
  repeat: false,
  gapX: 220,
  gapY: 100,
  rotate: 0,
  maxWidth: null,
  position: 'bottom-right',
  opacity: 0.75,
  scale: 0.28,
  margin: 24,
};

function normalizeWatermarkConfig(config: Partial<WatermarkConfig> | undefined): WatermarkConfig {
  return {
    text: typeof config?.text === 'string' ? config.text : DEFAULT_WATERMARK_CONFIG.text,
    logoAssetId: config?.logoAssetId ?? null,
    color: typeof config?.color === 'string' ? config.color : DEFAULT_WATERMARK_CONFIG.color,
    fontFamily:
      typeof config?.fontFamily === 'string' ? config.fontFamily : DEFAULT_WATERMARK_CONFIG.fontFamily,
    fontSize: typeof config?.fontSize === 'number' ? config.fontSize : DEFAULT_WATERMARK_CONFIG.fontSize,
    repeat: typeof config?.repeat === 'boolean' ? config.repeat : DEFAULT_WATERMARK_CONFIG.repeat,
    gapX: typeof config?.gapX === 'number' ? config.gapX : DEFAULT_WATERMARK_CONFIG.gapX,
    gapY: typeof config?.gapY === 'number' ? config.gapY : DEFAULT_WATERMARK_CONFIG.gapY,
    rotate: typeof config?.rotate === 'number' ? config.rotate : DEFAULT_WATERMARK_CONFIG.rotate,
    maxWidth: typeof config?.maxWidth === 'number' ? config.maxWidth : DEFAULT_WATERMARK_CONFIG.maxWidth,
    position: WATERMARK_POSITIONS.includes(config?.position as WatermarkConfig['position'])
      ? (config?.position as WatermarkConfig['position'])
      : DEFAULT_WATERMARK_CONFIG.position,
    opacity:
      typeof config?.opacity === 'number' ? Math.min(1, Math.max(0, config.opacity)) : 0.75,
    scale: typeof config?.scale === 'number' ? Math.min(1, Math.max(0.05, config.scale)) : 0.28,
    margin: typeof config?.margin === 'number' ? Math.max(0, config.margin) : 24,
  };
}

type PreviewProps = {
  sampleUrl?: string;
  logoUrl?: string;
  config: WatermarkConfig;
  enabled: boolean;
};

function WatermarkPreview({ sampleUrl, logoUrl, config, enabled }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    const draw = async () => {
      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.src =
        sampleUrl ||
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
            <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#1677ff"/><stop offset="1" stop-color="#722ed1"/>
            </linearGradient></defs>
            <rect width="960" height="540" fill="url(#g)"/>
            <circle cx="760" cy="120" r="160" fill="rgba(255,255,255,.14)"/>
            <text x="48" y="480" fill="white" font-size="34" font-family="Arial">Watermark preview</text>
          </svg>
        `)}`;
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
      if (disposed) {
        return;
      }

      const width = 960;
      const height = 540;
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      if (!enabled || (!config.text && !logoUrl)) {
        return;
      }

      const logo = logoUrl ? new window.Image() : undefined;
      if (logo) {
        logo.crossOrigin = 'anonymous';
        logo.src = logoUrl!;
        await new Promise<void>((resolve) => {
          logo.onload = () => resolve();
          logo.onerror = () => resolve();
        });
      }

      const fontSize = Math.max(8, config.fontSize);
      context.font = `${fontSize}px ${config.fontFamily}`;
      const logoSize = logo?.complete && logo.naturalWidth > 0 ? fontSize * 1.6 : 0;
      const textWidth = config.text ? context.measureText(config.text.slice(0, 120)).width : 0;
      const tileWidth = Math.max(fontSize, textWidth + (logoSize ? logoSize * 1.3 : 0));
      const tileHeight = Math.max(fontSize * 1.5, logoSize);
      const margin = config.margin;
      if (config.repeat) {
        context.globalAlpha = config.opacity;
        for (let y = 0; y < height; y += tileHeight + config.gapY) {
          for (let x = 0; x < width; x += tileWidth + config.gapX) {
            context.save();
            context.translate(x, y + tileHeight);
            context.rotate((config.rotate * Math.PI) / 180);
            if (logo && logoSize) context.drawImage(logo, 0, -tileHeight, logoSize, logoSize);
            if (config.text) {
              context.fillStyle = config.color;
              context.font = `${fontSize}px ${config.fontFamily}`;
              context.fillText(config.text.slice(0, 120), logoSize ? logoSize * 1.3 : 0, -tileHeight / 2);
            }
            context.restore();
          }
        }
        context.restore();
        return;
      }
      const overlayWidth = Math.min(width, Math.max(1, tileWidth * Math.min(1, config.scale / 0.28)));
      const overlayHeight = Math.min(height, Math.max(1, tileHeight * (overlayWidth / tileWidth)));
      const positions = {
        'top-left': { x: margin, y: margin },
        'top-right': { x: width - overlayWidth - margin, y: margin },
        'bottom-left': { x: margin, y: height - overlayHeight - margin },
        'bottom-right': { x: width - overlayWidth - margin, y: height - overlayHeight - margin },
        center: { x: (width - overlayWidth) / 2, y: (height - overlayHeight) / 2 },
      };
      const position = positions[config.position];

      context.save();
      context.globalAlpha = config.opacity;
      let textX = position.x;
      if (logo?.complete && logo.naturalWidth > 0) {
        context.drawImage(
          logo,
          position.x,
          position.y + (overlayHeight - logoSize) / 2,
          logoSize,
          logoSize,
        );
        textX += logoSize * 1.3;
      }
      if (config.text) {
        context.fillStyle = config.color;
        context.font = `${fontSize}px ${config.fontFamily}`;
        context.textBaseline = 'middle';
        context.translate(position.x + overlayWidth / 2, position.y + overlayHeight / 2);
        context.rotate((config.rotate * Math.PI) / 180);
        context.fillText(config.text.slice(0, 120), -overlayWidth / 2 + (logoSize ? logoSize * 1.3 : 0), 0);
      }
      context.restore();
    };

    void draw();
    return () => {
      disposed = true;
    };
  }, [config, enabled, logoUrl, sampleUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', borderRadius: 8, background: '#f5f5f5' }}
    />
  );
}

function RenderProfileEditor({
  profile,
  onSuccess,
}: {
  profile: RenderProfile;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
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
    void getAssetPreviewUrl(logoAssetId)
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

  const handleLogoUpload = async (file: RcFile) => {
    setLogoUploading(true);
    try {
      const assetId = await uploadWatermarkLogo(file);
      form.setFieldValue(['watermarkConfig', 'logoAssetId'], assetId);
      setLogoUrl(URL.createObjectURL(file));
      void message.success('Đã tải logo watermark');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Không thể tải logo watermark');
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
          outputFormat: profile.outputFormat,
          maxWidth: profile.maxWidth,
          maxHeight: profile.maxHeight,
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
                outputFormat: values.outputFormat,
                maxWidth: values.maxWidth ?? null,
                maxHeight: values.maxHeight ?? null,
                imageQuality: values.imageQuality,
                videoBitrateBps: values.videoBitrateBps || null,
                watermarkEnabled: values.watermarkEnabled,
                watermarkConfig: normalizeWatermarkConfig(values.watermarkConfig),
              },
            },
            {
              onSuccess: () => {
                void message.success('Đã cập nhật render profile');
                onSuccess();
              },
              onError: (error) =>
                void message.error(
                  error instanceof Error ? error.message : 'Không thể cập nhật render profile',
                ),
            },
          );
        }}
      >
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} lg={14}>
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
            </Row>

            <Card size="small" title="Watermark" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="watermarkEnabled" label="Bật watermark" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item name={['watermarkConfig', 'text']} label="Text">
                <Input maxLength={200} placeholder="AG Go Preview" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name={['watermarkConfig', 'color']} label="Màu chữ">
                <Input type="color" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['watermarkConfig', 'fontFamily']} label="Font">
                <Select
                  options={['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Impact', 'Tahoma'].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name={['watermarkConfig', 'fontSize']} label="Font size">
                <InputNumber min={8} max={240} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name={['watermarkConfig', 'rotate']} label="Rotate">
                <InputNumber min={-360} max={360} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Logo">
                <Upload
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void handleLogoUpload(file);
                    return false;
                  }}
                >
                  <Button icon={<UploadCloud size={16} />} loading={logoUploading}>
                    Upload logo
                  </Button>
                </Upload>
                {logoUrl ? (
                  <div style={{ marginTop: 8 }}>
                    <Image src={logoUrl} width={96} height={48} style={{ objectFit: 'contain' }} />
                    <Button
                      type="link"
                      danger
                      icon={<RotateCcw size={14} />}
                      onClick={() => {
                        form.setFieldValue(['watermarkConfig', 'logoAssetId'], null);
                        setLogoUrl(undefined);
                      }}
                    >
                      Xóa logo
                    </Button>
                  </div>
                ) : null}
              </Form.Item>
              <Form.Item name={['watermarkConfig', 'logoAssetId']} hidden>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['watermarkConfig', 'position']} label="Vị trí">
                <Select
                  options={WATERMARK_POSITIONS.map((value) => ({ value, label: value }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name={['watermarkConfig', 'repeat']} label="Lặp watermark" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name={['watermarkConfig', 'maxWidth']} label="Max width">
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name={['watermarkConfig', 'gapX']} label="Gap X">
                <InputNumber min={40} max={2000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name={['watermarkConfig', 'gapY']} label="Gap Y">
                <InputNumber min={40} max={2000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['watermarkConfig', 'opacity']} label="Opacity">
                <Slider min={0} max={1} step={0.05} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['watermarkConfig', 'scale']} label="Scale">
                <Slider min={0.05} max={1} step={0.01} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['watermarkConfig', 'margin']} label="Margin">
                <InputNumber min={0} max={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title="Preview watermark"
              style={{ position: 'sticky', top: 16 }}
            >
              <Typography.Text type="secondary">Ảnh mẫu preview</Typography.Text>
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
                  Chọn ảnh mẫu
                </Button>
              </Upload>
              <WatermarkPreview
                sampleUrl={sampleUrl}
                logoUrl={logoUrl}
                config={config}
                enabled={watermarkEnabled}
              />
            </Card>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
          Lưu render profile
        </Button>
      </Form>
    </Card>
  );
}

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

  const profileCards = profiles.data?.map((profile) => (
    <RenderProfileEditor
      key={profile.id}
      profile={profile}
      onSuccess={() => void profiles.refetch()}
    />
  ));

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
                  Mỗi lần lưu sẽ tạo một version mới. Các render job đang chạy vẫn giữ version cũ.
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
