import type { SelectProps } from 'antd';
import { Select, Space } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountries } from '../hooks/use-countries';
import type { Country } from '../types/country.type';
import { CountryFlag } from './country-flag';

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export interface CountrySelectOption {
  value: string;
  label: ReactNode;
  searchLabel: string;
  code: string;
  country: Country;
}

export interface CountrySelectProps extends Omit<
  SelectProps<string, CountrySelectOption>,
  'options'
> {
  /** Whether the query to fetch countries is enabled. Defaults to true. */
  enabled?: boolean;
  /** Whether to render country flag next to the name. Defaults to true. */
  showFlag?: boolean;
  /** Flag height in pixels. Defaults to 14. */
  flagHeight?: number;
}

function defaultFilterOption(input: string, option?: CountrySelectOption): boolean {
  if (!input) return true;
  const rawInput = input.trim().toLowerCase();
  const normInput = removeAccents(rawInput);
  const cleanInput = normInput.replace(/\s+/g, '');

  const rawLabel = option?.searchLabel?.toLowerCase() ?? '';
  const normLabel = removeAccents(rawLabel);
  const cleanLabel = normLabel.replace(/\s+/g, '');
  const rawCode = option?.code?.toLowerCase() ?? '';

  return (
    rawLabel.includes(rawInput) ||
    normLabel.includes(normInput) ||
    cleanLabel.includes(cleanInput) ||
    rawCode.includes(rawInput)
  );
}

export function CountrySelect({
  enabled = true,
  showFlag = true,
  flagHeight = 14,
  placeholder,
  allowClear = true,
  showSearch = true,
  loading,
  filterOption = defaultFilterOption,
  ...selectProps
}: CountrySelectProps) {
  const { t } = useTranslation();
  const countries = useCountries(enabled);

  const options = useMemo<CountrySelectOption[]>(() => {
    return (countries.data ?? []).map((country) => ({
      value: country.id,
      label: (
        <Space size={8} align="center">
          {showFlag ? (
            <CountryFlag
              flagUrl={country.flagUrl}
              code={country.code}
              name={country.name}
              height={flagHeight}
            />
          ) : null}
          <span>{country.name}</span>
        </Space>
      ),
      searchLabel: country.name,
      code: country.code ?? '',
      country,
    }));
  }, [countries.data, showFlag, flagHeight]);

  return (
    <Select<string, CountrySelectOption>
      allowClear={allowClear}
      showSearch={showSearch}
      loading={loading ?? countries.isPending}
      placeholder={placeholder ?? t('projects.countryPlaceholder')}
      filterOption={filterOption}
      options={options}
      {...selectProps}
    />
  );
}
