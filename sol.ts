// ./consts/yesOrNoFilter.ts

const yesOrNoFilterConfig = {
  Yes: { value: 'YES', label: 'Yes', matcherValue: 'Yes' },
  No:  { value: 'NO',  label: 'No',  matcherValue: 'No' },
} as const;

export const YesOrNoFilter = Object.fromEntries(
  Object.entries(yesOrNoFilterConfig).map(([key, { value }]) => [key, value]),
) as { readonly [K in keyof typeof yesOrNoFilterConfig]: (typeof yesOrNoFilterConfig)[K]['value'] };

export type YesOrNoFilterValue = (typeof YesOrNoFilter)[keyof typeof YesOrNoFilter];

export const yesOrNoFilterParseValue = (key: string): string =>
  Object.values(yesOrNoFilterConfig).find(c => c.value === key)?.label ?? key;

// grid value → matcher value (YES → Yes)
export const yesOrNoToMatcherValue = Object.fromEntries(
  Object.values(yesOrNoFilterConfig).map(c => [c.value, c.matcherValue]),
) as Record<YesOrNoFilterValue, string>;

// matcher value → grid value (Yes → YES)
export const matcherToYesOrNoValue = Object.fromEntries(
  Object.values(yesOrNoFilterConfig).map(c => [c.matcherValue, c.value]),
) as Record<string, YesOrNoFilterValue>;


import {
  YesOrNoFilter,
  yesOrNoToMatcherValue,
  matcherToYesOrNoValue,
} from './consts/yesOrNoFilter';

[PropellantField.AllToAll]: {
  fromGridFilterModelToFilteringSpecs: (values: string[]): FilteringSpec => {
    if (!values || values.length === 0) return [];
    const parsedValues = values.map(v => yesOrNoToMatcherValue[v as YesOrNoFilterValue]);
    return fromFacetedSearchMatchers([
      {
        key: uid(),
        operator: 'and' as const,
        comparison: '=',
        field: PropellantField.AllToAll,
        value: parsedValues,
        text: parsedValues,
      },
    ]);
  },

  fromFilteringSpecToGridFilterModel: (matcher: Matcher) => {
    const values = arrayify(matcher.value).map(v => matcherToYesOrNoValue[v] ?? v);
    return { [PropellantField.AllToAll]: { values, refresh: true } };
  },
},