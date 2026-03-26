type GridFilterKeys = keyof typeof inColumnFiltersConfig.gridFilters;

const initialFilteringSpec = filteringSpec.map(filterDef => {
  const gridFilter = inColumnFiltersConfig.gridFilters?.[filterDef.field as GridFilterKeys];
  return gridFilter?.initialMatcher ?? filterDef;
});