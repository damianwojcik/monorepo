export const computeAggregatedValues = (
  children: BackendRow[],
  aggConfig: AggConfig,
): Partial<BackendRow> => {
  const result: Partial<BackendRow> = {};

  for (const [fieldKey, aggFunc] of Object.entries(aggConfig)) {
    const values = children
      .map(child => (child as Record<string, unknown>)[fieldKey])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      // Active agg value on the field itself
      (result as any)[fieldKey] = aggFunctions[aggFunc](values);

      // All aggregations under %fieldKey
      (result as any)[`%${fieldKey}`] = {
        sum: aggFunctions.sum(values),
        min: aggFunctions.min(values),
        max: aggFunctions.max(values),
        first: aggFunctions.first(values),
        last: aggFunctions.last(values),
      };
    }
  }

  return result;
};