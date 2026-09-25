import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import type { PreviewVariant } from '../api/media';
import { AUTO_QUALITY } from '../hooks/use-rendition-selection';

type RenditionPickerProps = {
  variants: PreviewVariant[];
  value: string;
  autoVariant?: PreviewVariant;
  isVideo: boolean;
  onChange: (value: string) => void;
};

function formatVariant(variant: PreviewVariant, isVideo: boolean): string {
  return isVideo && variant.height ? `${variant.height}p` : `${variant.width}px`;
}

export function RenditionPicker({
  variants,
  value,
  autoVariant,
  isVideo,
  onChange,
}: RenditionPickerProps) {
  const { t } = useTranslation();
  if (variants.length < 2) {
    return null;
  }
  const sorted = [...variants].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (
    <Segmented
      size="small"
      value={value}
      onChange={(next) => onChange(String(next))}
      options={[
        {
          value: AUTO_QUALITY,
          label: autoVariant
            ? `${t('media.qualityAuto')} (${formatVariant(autoVariant, isVideo)})`
            : t('media.qualityAuto'),
        },
        ...sorted.map((variant) => ({
          value: String(variant.width),
          label: formatVariant(variant, isVideo),
        })),
      ]}
    />
  );
}
