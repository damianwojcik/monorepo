export const convertGridFilterModelToFilteringSpec = (
  model: FilteringModelFilters,
  gridFilters: GridFilters,
  resetToInitial = false,
): FilteringSpec =>
  Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
    const values = model[colId]?.values;

    if (values?.length) {
      return gridFilter.toFilteringSpec(values);
    }

    if (resetToInitial) {
      return gridFilter.initialQuerySpec?.filteringSpec ?? [];
    }

    return [];
  });