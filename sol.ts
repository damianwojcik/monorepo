ts// utils/grid/numericValueGetter.ts
import type { ValueGetterParams } from 'ag-grid-community';

/**
 * Universal numeric valueGetter.
 * Reads the raw value via colDef.field (or colId as fallback) and coerces
 * string values to numbers, so built-in aggFuncs (sum/avg/min/max),
 * number filters and sorting work correctly.
 *
 * Returns null for missing / empty / non-numeric values — such rows are
 * skipped by aggregation instead of poisoning it.
 */
export const numericValueGetter = (params: ValueGetterParams): number | null => {
  const field = params.colDef.field ?? params.column.getColId();
  const raw = params.data?.[field];

  if (raw == null || raw === '') return null;

  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};
Clean and minimal. If dirty values (spaces, comma decimals) ever show up from the backend, normalize them in the rows mapper — not here.How to use itIdentified property access errors and fallback value issuesIdentified property access errors and fallback value issuesTwo problems with that line:
1. ValueGetterParams has no value — that's why it's red-squiggled. A valueGetter produces the value; there's no input value to destructure. You need to read from data:
tsvalueGetter: ({ data }) => parseNumberWithFallback(data?.[Field.DELTA_SIZE], null),
(value exists in valueFormatter/cellRenderer params, not here — easy to mix up.)
2. The fallback '-' reintroduces the original bug. Your getter would return number | '-', and '-' is a string, so sum skips those rows again — plus sorting and number filters get polluted. The dash belongs in the formatter:
tsvalueGetter: ({ data }) =>
  parseNumberWithFallback(data?.[Field.DELTA_SIZE], null),
valueFormatter: ({ value }) =>
  value == null
    ? '-'
    : formatDecimal(value, { comma: true, minimumDecimalPlaces: 3, maximumDecimalPlaces: 3 }),
Note parseNumberWithFallback(v, null) returns number | null, which is exactly what the grid wants — and your parseNumber already handles trimming and comma-stripping internally, so this replaces the util I wrote entirely. Nice find.
If you want it reusable across fields like before, wrap it:
ts// one place, e.g. common/src/config/gridValueGetters.ts
export const numericValueGetter =
  (field: Field) =>
  ({ data }: ValueGetterParams) =>
    parseNumberWithFallback(data?.[field], null);

// usage
valueGetter: numericValueGetter(Field.DELTA_SIZE),
One caveat on parseNumber's comma handling: it does replaceAll(',', '') — that treats commas as thousands separators ("1,448" → 1448). If the backend ever sends comma-decimal values ("1,448" meaning 1.448), you'd silently get a 1000× error. Worth checking what the Axess feed actually sends for sizes, given the 1.448 value visible in your first screenshot.I want it to work without defining fieldReconsidered field access strategy for simplified implementationReconsidered field access strategy for simplified implementationThen read the field off colDef inside the getter, same pattern as before but delegating parsing to your existing util:
ts// e.g. common/src/config/gridValueGetters.ts
import type { ValueGetterParams } from 'ag-grid-community';
import { parseNumberWithFallback } from '@ubs/vanilla-utils'; // adjust to real path

export const numericValueGetter = (params: ValueGetterParams): number | null => {
  const field = params.colDef.field ?? params.column.getColId();
  return parseNumberWithFallback(params.data?.[field], null);
};
Usage — no arguments, just reference it:
ts[Field.DELTA_SIZE]: {
  grid: {
    columnDef: {
      field: Field.DELTA_SIZE,   // ← this is what the getter reads
      width: 90,
      aggFunc: 'sum',
      enableValue: true,
      valueGetter: numericValueGetter,
      valueFormatter: ({ value }) =>
        value == null
          ? '-'
          : formatDecimal(value, { comma: true, minimumDecimalPlaces: 3, maximumDecimalPlaces: 3 }),
    },
  },
},
The requirement is that each colDef using it has field set (or a colId equal to the data key). If your worker.createFields factory already injects field from the Field.X key automatically — which its shape suggests it might — then you literally just add the valueGetter: numericValueGetter line per column and you're done.
Type note: parseNumberWithFallback<T>(v, null) returns number | null via generic inference, so the return annotation checks out with no cast.Can I fallback to “-“?Weighed fallback option against original problem-solving intentWeighed fallback option against original problem-solving intentYou can, but it brings back the exact bug you're fixing. parseNumberWithFallback(v, '-') returns number | '-', and every '-' is a string, so:

sum/avg/min/max skip those rows again → blank aggregates on sparse columns
number filters and sorting see a mixed number/string column
comparators may throw or misorder ('-' < 5 is nonsense coercion)

The grid convention is: valueGetter returns null for "no value", valueFormatter decides how "no value" looks. That separation is what makes aggregation, filtering, sorting, and export all behave.
So the dash lives here instead:
tsvalueFormatter: ({ value }) =>
  value == null ? '-' : formatDecimal(value, { ... }),
Same visual result — cell shows - — but the underlying value stays null and the math works.
If the motivation is avoiding repetition of that null-check in every formatter, wrap it once:
tsexport const withDash =
  (format: (value: number) => string) =>
  ({ value }: ValueFormatterParams): string =>
    value == null ? '-' : format(value);

// usage
valueFormatter: withDash(v => formatDecimal(v, { comma: true, minimumDecimalPlaces: 3, maximumDecimalPlaces: 3 })),
One check worth doing: group rows. If the aggregated value for a group can legitimately be absent (all children null), the formatter gets null there too and shows - — usually what you want, but confirm it doesn't clash with how your group rows render other columns.aggFunc 'average' and 'count' are not working still?Diagnosed formatter incompatibility with aggregation object structuresDiagnosed formatter incompatibility with aggregation object structuresAlmost certainly the formatter now, not the values. The built-in avg and count don't return plain numbers — they return objects:

avg → { count, value, toString() } (so nested groups can compute weighted averages correctly)
count → { value, toString() } (so counts can be summed up the tree)

With default rendering the grid calls toString() and it looks fine. But your valueFormatter does formatDecimal(value, ...) and formatDecimal receives an object → NaN/empty → blank cell. sum/min/max/first return plain numbers, which is why those work.
Fix in the formatter — unwrap before formatting:
tsconst toDisplayNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  // built-in avg/count agg results: { value: number, ... }
  if (typeof value === 'object' && 'value' in value) {
    return (value as { value: number }).value;
  }
  return null;
};

valueFormatter: ({ value }) => {
  const n = toDisplayNumber(value);
  return n == null ? '-' : formatDecimal(n, { comma: true, minimumDecimalPlaces: 3, maximumDecimalPlaces: 3 });
},