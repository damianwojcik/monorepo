// aggregation.ts

export type AggregationFunc = 'none' | 'avg' | 'count' | 'first' | 'last' | 'max' | 'min' | 'sum';

type AggFuncEntry = { label: string; default?: true };

type BaseFieldAggConfig = Partial<Record<AggregationFunc, AggFuncEntry>>;

type DefaultKeys<T extends BaseFieldAggConfig> = {
  [K in keyof T]: T[K] extends { default: true } ? K : never;
}[keyof T];

type ValidateOneDefault<T extends BaseFieldAggConfig> =
  DefaultKeys<T> extends infer D
    ? [D] extends [never]
      ? T
      : D extends AggregationFunc
        ? [Exclude<DefaultKeys<T>, D>] extends [never]
          ? T
          : "Error: only one entry may have default: true"
        : never
    : never;

export type FieldAggConfig<T extends BaseFieldAggConfig> =
  ValidateOneDefault<T> extends string
    ? { _error: ValidateOneDefault<T> }
    : T;


    // fields.ts
import type { FieldAggConfig } from './aggregation';

// ✅ OK
const myConfig = {
  sum: { label: 'Sum' },
  min: { label: 'Min', default: true as const },
  count: { label: 'Count' },
} satisfies FieldAggConfig<typeof myConfig>;

// ❌ Type error: { _error: "Error: only one entry may have default: true" }
const badConfig = {
  sum: { label: 'Total', default: true as const },
  min: { label: 'Min', default: true as const },
} satisfies FieldAggConfig<typeof badConfig>;