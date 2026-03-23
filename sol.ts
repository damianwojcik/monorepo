export const convertGridFilterModelToFilteringSpec = (
  model: community.FilterModel,
  gridFilters: worker.InternalConfig['gridFilters'],
  initial = false,
): FilteringSpec =>
  Object.entries(model).flatMap(([colId, { values }]) => {
    const gridFilter = gridFilters?.[colId];
    if (!gridFilter) return [];

    if (initial && gridFilter.defaultMatcher) {
      return [gridFilter.defaultMatcher];
    }

    return gridFilter.fromGridFilterModelToFilteringSpecs(values) ?? [];
  });