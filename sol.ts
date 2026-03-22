const newFilterModel: Record<string, any> = {};

filteringSpec?.forEach(matcher => {
  const gridFilter = gridFilters?.[matcher.field];
  if (!gridFilter) {
    logger.warn(`No grid filter found for colId: ${matcher.field}`);
    return;
  }
  const result = gridFilter.fromFilteringSpecToGridFilterModel(matcher);
  if (!result) return;

  for (const [key, val] of Object.entries(result)) {
    if (newFilterModel[key]) {
      // merge values arrays
      newFilterModel[key] = {
        ...newFilterModel[key],
        values: [...newFilterModel[key].values, ...val.values],
      };
    } else {
      newFilterModel[key] = val;
    }
  }
});