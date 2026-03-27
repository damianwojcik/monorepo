export const convertGridFilterModelToFilteringSpec = (
  model: FilterModel,
  gridFilters?: GridFilters,
  resetToInitial = false,
): FilteringSpec => {
  if (!gridFilters) return [];

  if (resetToInitial) {
    return Object.values(gridFilters).flatMap(gridFilter => {
      if (!gridFilter) return [];
      return gridFilter.initialQuerySpec?.filteringSpec ?? [];
    });
  }

  return Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
    if (!gridFilter) return [];

    const values = model[colId]?.values;
    if (!values?.length) return [];

    return gridFilter.toFilteringSpec(values) ?? [];
  });
};

export const convertFilteringSpecToGridFilterModel = (
  filteringSpec: FilteringSpec | undefined,
  gridFilters?: GridFilters,
): FilterModel => {
  if (!filteringSpec?.length) return {};

  const filterModel: FilterModel = {};

  for (const filterDef of filteringSpec) {
    const gridFilter = gridFilters?.[filterDef.field];

    if (!gridFilter) {
      continue;
    }

    const result = gridFilter.toGridFilterModel(filterDef);

    if (!result) {
      continue;
    }

    for (const [key, val] of Object.entries(result) as [string, any][]) {
      filterModel[key] = {
        ...filterModel[key],
        values: [...(filterModel[key]?.values ?? []), ...(val.values ?? [])],
        refresh: true,
      };
    }
  }

  return filterModel;
};