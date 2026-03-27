export const convertGridFilterModelToFilteringSpec = (
  model: FilterModel,
  gridFilters?: GridFilters,
  resetToInitial = false,
): FilteringSpec => {
  if (!gridFilters) return [];

  return Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
    if (!gridFilter) return [];

    if (resetToInitial) {
      const initialFilteringSpec = gridFilter.initialQuerySpec?.filteringSpec;

      return initialFilteringSpec?.length ? initialFilteringSpec : [];
    }

    const values = model[colId]?.values;
    if (!values?.length) return [];

    return gridFilter.toFilteringSpec(values) ?? [];
  });
};