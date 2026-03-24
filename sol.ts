// ./consts/sizeFilter.ts

const sizeFilterConfig = {
  GreaterThan5mm: { value: 'RANGE_GREATER_THAN_5MM', label: '>= 5 MM',           min: 5,         max: Infinity },
  From3mmTo5mm:   { value: 'RANGE_3MM_5MM',          label: '=> 3 MM to < 5 MM', min: 3,         max: 5 },
  From1mmTo3mm:   { value: 'RANGE_1MM_3MM',          label: '=> 1 MM to < 3 MM', min: 1,         max: 3 },
  From500kTo1m:   { value: 'RANGE_500K_1MM',         label: '=> 500K to < 1 MM', min: 0.5,       max: 1 },
  LessThan500k:   { value: 'RANGE_LESS_THAN_500K',   label: '< 500K',            min: -Infinity, max: 0.5 },
} as const;

export const SizeFilter = Object.fromEntries(
  Object.entries(sizeFilterConfig).map(([key, { value }]) => [key, value]),
) as { readonly [K in keyof typeof sizeFilterConfig]: (typeof sizeFilterConfig)[K]['value'] };

export type SizeFilterValue = (typeof SizeFilter)[keyof typeof SizeFilter];

export const sizeFilterParseValue = (key: string): string =>
  Object.values(sizeFilterConfig).find(c => c.value === key)?.label ?? key;

export const sizeFilterRanges: Record<SizeFilterValue, { min: number; max: number }> = Object.fromEntries(
  Object.values(sizeFilterConfig).map(c => [c.value, { min: c.min, max: c.max }]),
) as Record<SizeFilterValue, { min: number; max: number }>;