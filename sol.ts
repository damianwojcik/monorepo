const isUpdatingFromGrid = useRef(false);

const handleFilterChange = hooks.useDynamicCallback((event: community.FilterChangedEvent) => {
  if (event.source !== 'columnFilter') {
    return;
  }

  const filterModel = event.api.getFilterModel();
  const newFilteringSpec = filters.convertGridFilterModelToFilteringSpec(filterModel, gridFilters);

  if (!areFilteringSpecsEqual(filteringSpec, newFilteringSpec)) {
    isUpdatingFromGrid.current = true;
    updateQuerySpec(filters.PROPELLANT_V1_FILTERING_SPEC, {
      filteringSpec: newFilteringSpec,
    });
  }
});

// Sync effect: filteringSpec → grid
useEffect(() => {
  const api = agGridRef.current?.api;
  if (!api) return;

  // Skip if this change originated from the grid itself
  if (isUpdatingFromGrid.current) {
    isUpdatingFromGrid.current = false;
    return;
  }

  const currentFilterModel = api.getFilterModel();
  const expectedFilterModel = filters.convertFilteringSpecToGridFilterModel(filteringSpec, gridFilters);

  if (!isEqualFilterModel(currentFilterModel, expectedFilterModel)) {
    api.setFilterModel(expectedFilterModel);
  }
}, [filteringSpec]);