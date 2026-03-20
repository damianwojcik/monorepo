// Reverse lookup
const YesOrNoReverse = Object.fromEntries(
  Object.entries(YesOrNoFilter).map(([k, v]) => [v, k])
) as Record<string, string>;

[PropellantField.AllToAll]: {
  // ...
  fromFilteringSpecToGridFilterModel: (specs: FilteringSpec[]) => {
    const spec = specs.find(s => s.field === PropellantField.AllToAll);
    if (!spec) return ({});
    const values = (spec.value as string[]).map(v => YesOrNoReverse[v] ?? v);
    return { values, refresh: true };
  },
},


const DateTimeFilterReverse = Object.fromEntries(
  Object.entries(DateTimeFilter).map(([_, v]) => {
    // map the text values back: '-7d' → 'ONE_WEEK', '-1m' → 'ONE_MONTH', etc.
    const textMap: Record<string, string> = {
      '-7d': 'ONE_WEEK', '-1m': 'ONE_MONTH', 
      '-2m': 'TWO_MONTHS', '-3m': 'THREE_MONTHS'
    };
    return [v, v]; // values are already the enum values
  })
);

// Actually simpler — just reverse the text-to-enum mapping:
const textToDateTimeFilter: Record<string, string> = {
  '-7d': 'ONE_WEEK',
  '-1m': 'ONE_MONTH',
  '-2m': 'TWO_MONTHS',
  '-3m': 'THREE_MONTHS',
};

[PropellantField.TradingDateAndTime]: {
  // ...
  fromFilteringSpecToGridFilterModel: (specs: FilteringSpec[]) => {
    const spec = specs.find(s => s.field === PropellantField.TradingDateAndTime);
    if (!spec) return ({});
    const value = textToDateTimeFilter[spec.text] ?? spec.text;
    return { values: [value], refresh: true };
  },
},