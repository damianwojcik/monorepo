const filterModel = event.api.getFilterModel();

const newFilteringSpecs = Object.entries(filterModel).flatMap(([colId, value]) => {
  const gridFilter = gridFilters[colId];
  if (!gridFilter) {
    console.warn('No gridFilter found for', colId);
    return [];
  }
  return gridFilter.toFilteringSpec(value.values);
});