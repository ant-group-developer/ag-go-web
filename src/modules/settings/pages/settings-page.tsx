import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Col,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Slider,
  Spin,
  Switch,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import { ImagePlus, Plus, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../shared/components/select';
import {
  getRenderProfiles,
  getWatermarkLogoUrl,
  rerenderWatermark,
  uploadWatermarkLogo,
  WATERMARK_FONT_WEIGHTS,
  WATERMARK_POSITIONS,
  type RenderProfile,
  type RenderVariantSpec,
} from '../../render/api/render';
import { useUpdateRenderProfile } from '../../render/hooks/use-render';
import {
  isValidResolution,
  normalizeRenderSizes,
  normalizeRenderVariants,
  RESOLUTION_MAX,
  RESOLUTION_MIN,
  RESOLUTION_PRESETS,
  resolutionLabel,
  THUMBNAIL_WIDTH_MAX,
  THUMBNAIL_WIDTH_MIN,
  VARIANTS_MAX_COUNT,
} from '../../render/utils/render-sizes';
import { normalizeWatermarkConfig, WATERMARK_LIMITS } from '../../render/utils/watermark-config';
import { WATERMARK_FONTS } from '../../render/utils/watermark-fonts';
import { WatermarkPreview } from '../components/watermark-preview';
import { useSettings, useUpdateSettings } from '../hooks/use-settings';

const FONT_CATEGORIES = ['sans-serif', 'serif', 'monospace'] as const;

/** Font picker options grouped by category; keeps a saved family that is no longer listed. */
function getFontOptions(current: string) {
  const groups = FONT_CATEGORIES.map((category) => ({
    label: category,
    options: WATERMARK_FONTS.filter((font) => font.category === category).map((font) => ({
      value: font.family,
      label: <span style={{ fontFamily: `"${font.family}", ${category}` }}>{font.family}</span>,
      searchText: font.family,
    })),
  }));
  return WATERMARK_FONTS.some((font) => font.family === current)
    ? groups
    : [
        ...groups,
        { label: 'other', options: [{ value: current, label: current, searchText: current }] },
      ];
}

const FONT_WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

const CUSTOM_RESOLUTION = 'custom';

/** Resolution picker of one variant row: the usual presets, or a custom 144–4320 value. */
function ResolutionSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange?: (value: number) => void;
}) {
  const { t } = useTranslation();
  const isPreset = RESOLUTION_PRESETS.includes(value as (typeof RESOLUTION_PRESETS)[number]);
  const [customMode, setCustomMode] = useState(!isPreset);

  useEffect(() => {
    setCustomMode(!RESOLUTION_PRESETS.includes(value as (typeof RESOLUTION_PRESETS)[number]));
  }, [value]);

  return (
    // Fixed width so the watermark switches line up whether or not the custom input shows.
    <Flex gap={8} style={{ width: 268, maxWidth: '100%' }}>
      <Select
        style={{ width: 140, flexShrink: 0 }}
        value={customMode ? CUSTOM_RESOLUTION : value}
        options={[
          ...RESOLUTION_PRESETS.map((resolution) => ({
            value: resolution,
            label: resolutionLabel(resolution),
          })),
          { value: CUSTOM_RESOLUTION, label: t('settings.variantResolutionCustom') },
        ]}
        onChange={(next) => {
          if (next === CUSTOM_RESOLUTION) {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange?.(Number(next));
        }}
      />
      {customMode ? (
        <InputNumber
          min={RESOLUTION_MIN}
          max={RESOLUTION_MAX}
          precision={0}
          addonAfter="p"
          value={isPreset ? undefined : value}
          style={{ width: 120 }}
          onChange={(next) => onChange?.(Number(next) || 0)}
        />
      ) : null}
    </Flex>
  );
}

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
  const variants: Partial<RenderVariantSpec>[] =
    Form.useWatch(['renderSizes', 'variants'], form) ?? [];
  // watermarkEnabled is derived server-side from the variants; used here only to preview it.
  const watermarkEnabled = variants.some((variant) => Boolean(variant?.watermark));
  // Read inside the modal's onOk, which is bound once when the modal opens; a ref stays current.
  const reuseExistingOnRerenderRef = useRef(true);

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
      const result = await rerenderWatermark({
        scope: 'FILTER',
        mediaType: 'ALL',
        reuseExisting: reuseExistingOnRerenderRef.current,
      });
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
    reuseExistingOnRerenderRef.current = true;
    modal.confirm({
      title: t('settings.applyToExistingTitle'),
      content: (
        <Flex vertical gap={8}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {t('settings.applyToExistingContent')}
          </Typography.Paragraph>
          <Checkbox
            defaultChecked
            onChange={(event) => {
              reuseExistingOnRerenderRef.current = event.target.checked;
            }}
          >
            {t('render.reuseExisting')}
          </Checkbox>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('render.reuseExistingHint')}
          </Typography.Text>
        </Flex>
      ),
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
          renderSizes: normalizeRenderSizes(profile.renderSizes, profile.watermarkEnabled),
          imageQuality: profile.imageQuality,
          videoBitrateBps: profile.videoBitrateBps ?? '',
          watermarkConfig: normalizeWatermarkConfig(profile.watermarkConfig),
        }}
        onFinish={(values) => {
          updateProfile.mutate(
            {
              id: profile.id,
              input: {
                name: values.name,
                renderSizes: {
                  variants: normalizeRenderVariants(values.renderSizes?.variants),
                  thumbnailWidth: values.renderSizes?.thumbnailWidth,
                },
                imageQuality: values.imageQuality,
                videoBitrateBps: values.videoBitrateBps || null,
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
                <Col xs={24}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {t('settings.variantsHint')}
                  </Typography.Text>
                  <Form.List
                    name={['renderSizes', 'variants']}
                    rules={[
                      {
                        validator: async (_, value: RenderVariantSpec[] = []) => {
                          if (value.length === 0) {
                            return Promise.reject(new Error(t('settings.variantsRequired')));
                          }
                          if (value.length > VARIANTS_MAX_COUNT) {
                            return Promise.reject(
                              new Error(
                                t('settings.variantsTooMany', { count: VARIANTS_MAX_COUNT }),
                              ),
                            );
                          }
                          const keys = value.map(
                            (variant) => `${variant?.resolution}:${Boolean(variant?.watermark)}`,
                          );
                          if (new Set(keys).size !== keys.length) {
                            return Promise.reject(new Error(t('settings.variantsDuplicate')));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    {(fields, { add, remove }, { errors }) => (
                      <>
                        {fields.map((field) => (
                          <Flex
                            key={field.key}
                            gap={12}
                            align="baseline"
                            style={{ marginBottom: 12 }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, 'resolution']}
                              label={t('settings.variantResolution')}
                              style={{ marginBottom: 0 }}
                              rules={[
                                {
                                  validator: (_, value: unknown) =>
                                    isValidResolution(value)
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error(
                                            t('settings.variantResolutionInvalid', {
                                              min: RESOLUTION_MIN,
                                              max: RESOLUTION_MAX,
                                            }),
                                          ),
                                        ),
                                },
                              ]}
                            >
                              <ResolutionSelect />
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'watermark']}
                              label={t('settings.variantWatermark')}
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 size={16} />}
                              aria-label={t('settings.removeVariant')}
                              disabled={fields.length <= 1}
                              onClick={() => remove(field.name)}
                            />
                          </Flex>
                        ))}
                        <Form.ErrorList errors={errors} />
                        <Button
                          type="dashed"
                          icon={<Plus size={16} />}
                          disabled={fields.length >= VARIANTS_MAX_COUNT}
                          onClick={() => add({ resolution: 720, watermark: false })}
                        >
                          {t('settings.addVariant')}
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Col>
                <Col xs={24} md={12} style={{ marginTop: 16 }}>
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
                <Col xs={24}>
                  <Alert
                    type="info"
                    showIcon
                    message={t('settings.watermarkAppliesHint')}
                    style={{ marginBottom: 16 }}
                  />
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
                  <Form.Item
                    name={['watermarkConfig', 'fontFamily']}
                    label={t('settings.font')}
                    tooltip={t('settings.fontHint')}
                  >
                    <Select options={getFontOptions(config.fontFamily)} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name={['watermarkConfig', 'fontWeight']}
                    label={t('settings.fontWeight')}
                    tooltip={t('settings.fontWeightHint')}
                  >
                    <Select
                      showSearch={false}
                      options={WATERMARK_FONT_WEIGHTS.map((value) => ({
                        value,
                        label: `${value} · ${FONT_WEIGHT_NAMES[value]}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6} hidden={!config.repeat}>
                  <Form.Item
                    name={['watermarkConfig', 'fontSize']}
                    label={t('settings.fontSize')}
                    tooltip={t('settings.fontSizeRepeatHint')}
                  >
                    <InputNumber
                      min={WATERMARK_LIMITS.fontSize.min}
                      max={WATERMARK_LIMITS.fontSize.max}
                      style={{ width: '100%' }}
                    />
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
                    <Slider
                      min={WATERMARK_LIMITS.scale.min}
                      max={WATERMARK_LIMITS.scale.max}
                      step={0.01}
                      marks={{ 1: '100%' }}
                      tooltip={{ formatter: (value) => `${Math.round((value ?? 0) * 100)}%` }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} hidden={!logoUrl}>
                  <Form.Item
                    name={['watermarkConfig', 'logoScale']}
                    label={t('settings.logoSize')}
                    tooltip={t('settings.logoSizeHint')}
                  >
                    <Slider
                      min={WATERMARK_LIMITS.logoScale.min}
                      max={WATERMARK_LIMITS.logoScale.max}
                      step={0.05}
                      marks={{ 1: '1x' }}
                      tooltip={{ formatter: (value) => `${value}x` }}
                    />
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
                  <Form.Item
                    name="loginBackgroundUrl"
                    label={t('settings.loginBackgroundUrl')}
                    extra={t('settings.loginBackgroundUrlHint')}
                  >
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
