export const aggConfig = <T extends BaseFieldAggConfig>(
  config: ValidateOneDefault<T> extends string
    ? { _error: ValidateOneDefault<T> }
    : T
): AnyFieldAggConfig => config as AnyFieldAggConfig;