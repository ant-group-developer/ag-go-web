import type { SelectProps } from 'antd';
import { Select as AntSelect } from 'antd';
import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';
import { selectFilterOption } from '../lib/select-search';

/**
 * antd Select with search enabled by default. Search ignores case and Vietnamese
 * diacritics, and also matches an option's `searchText` (e.g. its English translation).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Select<V = any, O extends BaseOptionType | DefaultOptionType = DefaultOptionType>(
  props: SelectProps<V, O>,
) {
  return (
    <AntSelect<V, O>
      {...props}
      showSearch={props.showSearch ?? true}
      filterOption={props.filterOption ?? selectFilterOption}
    />
  );
}
