// buildAggregationConfig2 - just pass through the whole aggFuncs config
export const buildAggregationConfig2 = (fields: Fields): AggConfig2 => {
  const config: AggConfig2 = {};
  for (const [fieldKey, fieldDef] of Object.entries(fields)) {
    if ('aggFuncs' in fieldDef && fieldDef.aggFuncs) {
      config[fieldKey] = fieldDef.aggFuncs;
    }
  }
  return config;
};

// AggConfig2 type
type AggConfig2 = Record<string, FieldAggFuncsConfig>;

export const computeAggregatedValues2 = (
  children: BackendRow[],
  aggConfig: AggConfig2
): Partial<BackendRow> => {
  const result: Partial<BackendRow> = {};

  for (const [fieldKey, aggFuncsConfig] of Object.entries(aggConfig)) {
    const values = children
      .map(child => (child as Record<string, unknown>)[fieldKey])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      // Compute all configured agg functions
      const allComputed = Object.fromEntries(
        Object.entries(aggFuncsConfig)
          .filter(([key]) => key in aggFunctions)
          .map(([key, entry]) => [
            key,
            aggFunctions[key as AggregationFunc].fn(values),
          ])
      );

      // Store all values under %fieldKey
      (result as any)[`%${fieldKey}`] = allComputed;

      // Store default value under fieldKey for display
      const defaultKey = Object.entries(aggFuncsConfig)
        .find(([, entry]) => entry?.default === true)?.[0]
        ?? Object.keys(aggFuncsConfig)[0]; // fallback to first

      if (defaultKey) {
        (result as any)[fieldKey] = allComputed[defaultKey];
      }
    }
  }

  return result;
};