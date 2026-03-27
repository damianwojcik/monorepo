export const convertGridFilterModelToFilteringSpec = ({
  model,
  gridFilters,
  resetToInitial = false,
}: {
  model: FilterModel;
  gridFilters?: GridFilters;
  resetToInitial?: boolean;
}): FilteringSpec => {
  console.log('!!! convert', { model, gridFilters });

  if (!gridFilters) return [];

  return Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
    if (!gridFilter) return [];

    if (resetToInitial) {
      return gridFilter.initialQuerySpec?.filteringSpec ?? [];
    }

    const values = model[colId]?.values;
    if (!values) return [];

    return gridFilter.toFilteringSpec(values) ?? [];
  });
};