const sizeFilterConfig = {
  GreaterThan5mm: { value: 'RANGE_GREATER_THAN_5MM', label: '>= 5 MM' },
  From3mmTo5mm:   { value: 'RANGE_3MM_5MM',          label: '=> 3 MM to < 5 MM' },
  From1mmTo3mm:   { value: 'RANGE_1MM_3MM',          label: '=> 1 MM to < 3 MM' },
  From500kTo1m:   { value: 'RANGE_500K_1MM',         label: '=> 500K to < 1 MM' },
  LessThan500k:   { value: 'RANGE_LESS_THAN_500K',   label: '< 500K' },
} as const;

export const SizeFilter = Object.fromEntries(
  Object.entries(sizeFilterConfig).map(([key, { value }]) => [key, value]),
) as { readonly [K in keyof typeof sizeFilterConfig]: (typeof sizeFilterConfig)[K]['value'] };

export type SizeFilterValues = (typeof SizeFilter)[keyof typeof SizeFilter];

export const sizeFilterParseValue = (key: string): string =>
  Object.values(sizeFilterConfig).find(c => c.value === key)?.label ?? key;