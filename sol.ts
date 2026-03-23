const sizeFilterConfig = {
  GreaterThan5mm: { value: 'RANGE_GREATER_THAN_5MM', label: '>= 5 MM', min: 5_000_000, max: null },
  From3mmTo5mm:   { value: 'RANGE_3MM_5MM',          label: '=> 3 MM to < 5 MM', min: 3_000_000, max: 5_000_000 },
  From1mmTo3mm:   { value: 'RANGE_1MM_3MM',          label: '=> 1 MM to < 3 MM', min: 1_000_000, max: 3_000_000 },
  From500kTo1m:   { value: 'RANGE_500K_1MM',         label: '=> 500K to < 1 MM', min: 500_000,   max: 1_000_000 },
  LessThan500k:   { value: 'RANGE_LESS_THAN_500K',   label: '< 500K',            min: null,      max: 500_000 },
} as const;

fromGridFilterModelToFilteringSpecs: (values: string[]): FilteringSpec => {
  if (!values || values.length === 0) return [];
  const field = PropellantField.NotionalAmount;

  const sizeMatchers = values.map(v => {
    const operator = 'or';
    const base = { operator, field };
    const range = sizeFilterRanges[v as SizeFilterValue];

    if (v === SizeFilter.LessThan500k) {
      return { ...base, key: uid(), comparison: '<', value: range.max, text: range.max.toString() };
    }
    if (v === SizeFilter.GreaterThan5mm) {
      return { ...base, key: uid(), comparison: '>', value: range.min, text: range.min.toString() };
    }
    return {
      ...base,
      // the rest — both min and max with 'between' or two matchers
    };
  });
  // ...
},