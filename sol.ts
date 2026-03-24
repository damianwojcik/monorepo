// ./consts/yesOrNoFilter.ts

const yesOrNoFilterConfig = {
  Yes: { value: 'YES', label: 'Yes' },
  No:  { value: 'NO',  label: 'No' },
} as const;

export const YesOrNoFilter = Object.fromEntries(
  Object.entries(yesOrNoFilterConfig).map(([key, { value }]) => [key, value]),
) as { readonly [K in keyof typeof yesOrNoFilterConfig]: (typeof yesOrNoFilterConfig)[K]['value'] };

export type YesOrNoFilterValue = (typeof YesOrNoFilter)[keyof typeof YesOrNoFilter];

export const yesOrNoFilterParseValue = (key: string): string =>
  Object.values(yesOrNoFilterConfig).find(c => c.value === key)?.label ?? key;