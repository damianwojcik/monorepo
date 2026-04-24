export type AggregationFunc = 'none' | 'avg' | 'count' | 'first' | 'last' | 'max' | 'min' | 'sum';

export const aggFunctions: Record<AggregationFunc, (values: number[]) => number | undefined> = {
  none: (_vals) => undefined,
  avg: (vals) => vals.reduce((a, b) => a + b, 0) / vals.length,
  count: (vals) => vals.length,
  first: (vals) => vals[0],
  last: (vals) => vals[vals.length - 1],
  max: (vals) => Math.max(...vals),
  min: (vals) => Math.min(...vals),
  sum: (vals) => vals.reduce((a, b) => a + b, 0),
};

export const computeAggregatedValues = (children: BackendRow[]): Partial<BackendRow> => {
  const result: Partial<BackendRow> = {};

  for (const [fieldKey, aggFunc] of Object.entries(aggConfig)) {
    const values = children
      .map((child) => (child as Record<string, unknown>)[fieldKey])
      .filter((v): v is number => typeof v === 'number');

    // TODO: any
    if (values.length > 0) {
      // active
      (result as any)[fieldKey] = search.aggFunctions[aggFunc](values);
      (result as any)[`%${fieldKey}`] = {
        sum: search.aggFunctions.sum(values),
        min: search.aggFunctions.min(values),
        max: search.aggFunctions.max(values),
        first: search.aggFunctions.first(values),
        last: search.aggFunctions.last(values),
      };
    }
  }

  return result;
};