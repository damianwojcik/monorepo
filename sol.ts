// consts/dateTimeFilter.ts

const dateTimeFilterConfig = {
  OneWeek:      { value: 'ONE_WEEK',      label: '1W', tenor: '-7d' },
  OneMonth:     { value: 'ONE_MONTH',     label: '1M', tenor: '-1m' },
  TwoMonths:    { value: 'TWO_MONTHS',    label: '2M', tenor: '-2m' },
  ThreeMonths:  { value: 'THREE_MONTHS',  label: '3M', tenor: '-3m' },
} as const;

export const DateTimeFilter = Object.fromEntries(
  Object.entries(dateTimeFilterConfig).map(([key, { value }]) => [key, value]),
) as { readonly [K in keyof typeof dateTimeFilterConfig]: (typeof dateTimeFilterConfig)[K]['value'] };

export type DateTimeFilterKey = keyof typeof dateTimeFilterConfig;
export type DateTimeFilterValue = (typeof DateTimeFilter)[DateTimeFilterKey];

export const dateTimeFilterLabelFormatter = (key: string): string => {
  const entry = Object.values(dateTimeFilterConfig).find(c => c.value === key);
  return entry?.label ?? key;
};

export const dateTimeFilterTenorToValue = Object.fromEntries(
  Object.values(dateTimeFilterConfig).map(c => [c.tenor, c.value]),
) as Record<string, DateTimeFilterValue>;

export const dateTimeFilterValueToTenor = Object.fromEntries(
  Object.values(dateTimeFilterConfig).map(c => [c.value, c.tenor]),
) as Record<DateTimeFilterValue, string>;

// gridFilters.ts

import {
  type DateTimeFilterValue,
  dateTimeFilterValueToTenor,
  dateTimeFilterTenorToValue,
} from '../grid/components/Grid/filters/consts/dateTimeFilter';

// ...

fromGridFilterModelToFilteringSpecs: (values: string[]): FilteringSpec => {
  const value = values[0] as DateTimeFilterValue;
  if (!value) return undefined;

  const text = dateTimeFilterValueToTenor[value];
  if (!text) return undefined;

  const matcher = createFacetedSearchMatcher({
    operator: 'and',
    comparison: '>',
    field: PropellantField.TradingDateAndTime,
    value: { text },
    text,
  });
  return fromFacetedSearchMatchers([matcher]);
},

fromFilteringSpecToGridFilterModel: (matcher: Matcher) => {
  const tenor = matcher.value?.text;
  const enumVal = tenor ? dateTimeFilterTenorToValue[tenor] : undefined;
  if (!enumVal) return {};

  return {
    [PropellantField.TradingDateAndTime]: {
      values: arrayify(enumVal),
      refresh: true,
    },
  };
},

// extendedColDefs.ts

import {
  DateTimeFilter,
  dateTimeFilterLabelFormatter,
} from '../grid/components/Grid/filters/consts/dateTimeFilter';

// ...

values: Object.values(DateTimeFilter),
filterLabelFormatter: dateTimeFilterLabelFormatter,