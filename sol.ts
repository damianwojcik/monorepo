// useEffect: querySpec → ag-grid
useEffect(() => {
  const api = agGridRef.current?.api;
  if (!api) return;

  api.setFilterModel(
    buildFilterModelFromSpec(filteringSpec, gridFilters),
    'programmatic' as any,
  );
}, [filteringSpec]);

// ag-grid → querySpec
const handleFilterChange = hooks.useDynamicCallback((event: community.FilterChangedEvent) => {
  if (event.source !== 'columnFilter') return;
  // 'programmatic' source won't match 'columnFilter', so it's already filtered out

  const filterModel = event.api.getFilterModel();
  const newFilteringSpec = convertGridFilterModelToFilteringSpec(filterModel, gridFilters);

  updateQuerySpec(PROPELLANT_V1_FILTERING_SPEC, {
    filteringSpec: newFilteringSpec,
  });
});

