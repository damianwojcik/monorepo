// aggregation.ts

export type AggFn = 'sum' | 'min' | 'max' | 'first' | 'last';

export interface AggConfig {
  field: string;
  aggFn: AggFn;
}

const isAggFn = (v: unknown): v is AggFn =>
  ['sum', 'min', 'max', 'first', 'last'].includes(v as string);

export const aggregate = (values: number[], fn: AggFn): number | undefined => {
  const nums = values.filter(v => v != null && !isNaN(v));
  if (nums.length === 0) return undefined;
  switch (fn) {
    case 'sum':   return nums.reduce((a, b) => a + b, 0);
    case 'min':   return Math.min(...nums);
    case 'max':   return Math.max(...nums);
    case 'first': return nums[0];
    case 'last':  return nums[nums.length - 1];
  }
};

export const buildAggConfigs = (
  fields: Record<string, unknown>  // ← accepts any record
): AggConfig[] =>
  Object.entries(fields)
    .flatMap(([field, v]) => {
      const adapterAgg = (v as Record<string, unknown>)?.adapterAgg;
      return isAggFn(adapterAgg) ? [{ field, aggFn: adapterAgg }] : [];
    });