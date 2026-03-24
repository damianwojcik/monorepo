import {
  DateTimeFilter,
  type DateTimeFilterValue,
  enumToTenor,
  tenorToEnum,
} from './consts/dateTimeFilterValue';

[PropellantField.TradingDateAndTime]: {
  defaultMatcher: createFacetedSearchMatcher({
    operator: 'and',
    comparison: '>',
    field: PropellantField.TradingDateAndTime,
    value: { text: enumToTenor[DateTimeFilter.OneMonth] },
    text: enumToTenor[DateTimeFilter.OneMonth],
  }),
  defaultSorter: {
    field: PropellantField.TradingDateAndTime,
    direction: sorting.SortDirectionDescending,
  },

  fromGridFilterModelToFilteringSpecs: (values: string[]): FilteringSpec => {
    const value = values[0] as DateTimeFilterValue;
    if (!value) return undefined;

    const text = enumToTenor[value];
    if (!text) return undefined;

    const matcher = {
      key: uid(),
      operator: 'and',
      comparison: '>',
      field: PropellantField.TradingDateAndTime,
      value: { text },
      text,
    };
    return [matcher];
  },

  fromFilteringSpecToGridFilterModel: (matcher: Matcher) => {
    const tenor = matcher.value?.text;
    const enumVal = tenor ? tenorToEnum[tenor] : undefined;
    if (!enumVal) return {};

    return {
      [PropellantField.TradingDateAndTime]: {
        values: arrayify(enumVal),
        refresh: true,
      },
    };
  },
},