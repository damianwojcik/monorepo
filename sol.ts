type AggFuncEntry = { label: string; default?: boolean };

// Only match entries where default is explicitly true
type DefaultKeys<T extends BaseFieldAggConfig> = {
  [K in keyof T]: T[K] extends { default: true } ? K : never;
}[keyof T];

// Collect all default:true keys into a tuple to count them
type TupleFromUnion<U, T = U> =
  [U] extends [never]
    ? []
    : T extends any
      ? [T, ...TupleFromUnion<Exclude<U, T>>]
      : never;

type ValidateOneDefault<T extends BaseFieldAggConfig> =
  TupleFromUnion<DefaultKeys<T>>['length'] extends 0 | 1
    ? T
    : "Error: only one entry may have default: true";

export type FieldAggConfig<T extends BaseFieldAggConfig> =
  ValidateOneDefault<T> extends string
    ? { _error: ValidateOneDefault<T> }
    : T;

export const aggConfig = <T extends BaseFieldAggConfig>(
  config: ValidateOneDefault<T> extends string
    ? { _error: ValidateOneDefault<T> }
    : T
): AnyFieldAggConfig => config as AnyFieldAggConfig;