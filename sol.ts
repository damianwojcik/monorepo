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