type GridFilterConfig<TFilterValue = unknown> = {
  filter: typeof ExternalFilter;
  filterParams: ExternalFilterProps;
  // querySpec → ag-grid filter model
  fromFilteringSpecToGridFilterModel: (matcher: Matcher) => ColFilterModel;
  // ag-grid filter model → querySpec
  fromGridFilterModelToFilteringSpecs: (values: string[]) => FilteringSpec;
  // initial querySpec matcher for this field
  defaultMatcher: Matcher | undefined;
};

export const initialFilteringSpec: FilteringSpec = 
  Object.entries(gridFilters)
    .map(([_, config]) => config.defaultMatcher)
    .filter(Boolean);