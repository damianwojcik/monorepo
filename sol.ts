export const buildFilterModelFromSpec = (
  filteringSpec: FilteringSpec | undefined,
  gridFilters: Partial<Record<string, GridFilter>>,
): Record<string, any> => {
  const filterModel: Record<string, any> = {};

  filteringSpec?.forEach(matcher => {
    const gridFilter = gridFilters?.[matcher.field];
    if (!gridFilter) {
      logger.warn(`No grid filter found for colId: ${matcher.field}`);
      return;
    }

    const result = gridFilter.fromFilteringSpecToGridFilterModel(matcher);
    if (!result) return;

    for (const [key, val] of Object.entries(result) as [string, any][]) {
      if (filterModel[key]) {
        filterModel[key] = {
          ...filterModel[key],
          values: [...filterModel[key].values, ...val.values],
        };
      } else {
        filterModel[key] = val;
      }
    }
  });

  return filterModel;
};
const newFilterModel = buildFilterModelFromSpec(filteringSpec, gridFilters);