const toDisplayNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'value' in value) {
    return (value as { value: number }).value;
  }
  return null;
};

valueFormatter: ({ value }) => {
  const n = toDisplayNumber(value);
  return n == null ? '-' : formatDecimal(n, { comma: true, minimumDecimalPlaces: 3, maximumDecimalPlaces: 3 });
},