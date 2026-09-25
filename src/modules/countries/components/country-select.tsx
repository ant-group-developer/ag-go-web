import type { SelectProps } from 'antd';
import { Space } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../shared/components/select';
import { matchesSearch } from '../../../shared/lib/search-text';
import { useCountries } from '../hooks/use-countries';
import type { Country } from '../types/country.type';
import { CountryFlag } from './country-flag';

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
  return matchesSearch(input, option?.searchLabel, option?.code);
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
