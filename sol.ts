import { sizeMapping } from './consts';

[PropellantField.NotionalAmount]: {
  fromGridFilterModelToFilteringSpecs: (values: string[]): FilteringSpec => {
    if (!values || values.length === 0) return [];
    const field = PropellantField.NotionalAmount;
    const sizeMatchers = values.map(v => {
      const operator = 'or';
      const base = { operator, field };
      const entry = sizeMapping[v as keyof typeof sizeMapping];
      if (!entry) return undefined;

      if (entry.max === 0.5) {  // LessThan500k
        return {
          ...base,
          key: uid(),
          comparison: '<',
          value: entry.max,
          text: entry.max.toString(),
        };
      }
      if (entry.min === 5) {  // GreaterThan5mm
        return {
          ...base,
          key: uid(),
          comparison: '>',
          value: entry.min,
          text: entry.min.toString(),
        };
      }
      return {
        ...base,
        key: uid(),
        comparison: '',
        value: entry.min,
        text: entry.min.toString(),
        valueTo: entry.max,
        textTo: entry.max.toString(),
      };
    }).filter(Boolean);
    return wrapInParens(sizeMatchers);
  },

  fromFilteringSpecToGridFilterModel: (matcher: Matcher) => {
    const [min, max]: [number, number] =
      'valueTo' in matcher && typeof matcher.valueTo === 'number'
        ? [matcher.value, matcher.valueTo]
        : matcher.comparison === '<'
          ? [-Infinity, matcher.value]
          : [matcher.value, Infinity];

    for (const [filterType, entry] of Object.entries(sizeMapping)) {
      if (entry.min === min && entry.max === max) {
        return {
          [PropellantField.NotionalAmount]: {
            values: [filterType],
            refresh: true,
          },
        };
      }
    }
    return {};
  },
},