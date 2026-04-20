// adapter-aggregation.ts
import type { BackendRow } from './fieldSchema';

export type AdapterAggFunc = 'sum' | 'first' | 'max' | 'min';

export type AggConfig = Record<string, AdapterAggFunc>;

/**
 * Build aggregation config from fields definition.
 * Returns a map of field key -> adapterAggFunc for fields that have it defined.
 */
export const buildAggConfig = <T extends Record<string, { adapterAggFunc?: AdapterAggFunc }>>(
  fields: T,
): AggConfig => {
  const config: AggConfig = {};
  for (const [fieldKey, fieldDef] of Object.entries(fields)) {
    if (fieldDef.adapterAggFunc) {
      config[fieldKey] = fieldDef.adapterAggFunc;
    }
  }
  return config;
};

const aggFunctions: Record<AdapterAggFunc, (values: number[]) => number | undefined> = {
  sum: (vals) => vals.reduce((a, b) => a + b, 0),
  first: (vals) => vals[0],
  max: (vals) => Math.max(...vals),
  min: (vals) => Math.min(...vals),
};

/**
 * Compute aggregated values for a parent row from its children.
 */
export const computeAggregatedValues = (
  children: BackendRow[],
  aggConfig: AggConfig,
): Partial<BackendRow> => {
  const result: Partial<BackendRow> = {};

  for (const [fieldKey, aggFunc] of Object.entries(aggConfig)) {
    const values = children
      .map((child) => child[fieldKey])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      (result as any)[fieldKey] = aggFunctions[aggFunc](values);
    }
  }

  return result;
};