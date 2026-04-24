export const aggFunctions = {
  none:  { label: 'None',    fn: (_vals: number[]) => undefined },
  avg:   { label: 'Average', fn: (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length },
  count: { label: 'Count',   fn: (vals: number[]) => vals.length },
  first: { label: 'First',   fn: (vals: number[]) => vals[0] },
  last:  { label: 'Last',    fn: (vals: number[]) => vals[vals.length - 1] },
  max:   { label: 'Max',     fn: (vals: number[]) => Math.max(...vals) },
  min:   { label: 'Min',     fn: (vals: number[]) => Math.min(...vals) },
  sum:   { label: 'Sum',     fn: (vals: number[]) => vals.reduce((a, b) => a + b, 0) },
} satisfies Record<AggregationFunc, { label: string; fn: (values: number[]) => number | undefined }>;



// options for the menu
const options = (Object.keys(aggFunctions) as AggregationFunc[]).map((value) => ({
  label: aggFunctions[value].label,
  value,
}));

// calling a function
aggFunctions[aggFunc].fn(values);

(result as any)[`%${fieldKey}`] = Object.fromEntries(
  (Object.keys(search.aggFunctions) as search.AggregationFunc[]).map((key) => [
    key,
    search.aggFunctions[key].fn(values),
  ])
);
(result as any)[fieldKey] = search.aggFunctions[aggFunc].fn(values);