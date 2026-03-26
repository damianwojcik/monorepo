const initialFilteringSpec = filteringSpec.map(filterDef => {
  const gridFilter = inColumnFiltersConfig.gridFilters?.[filterDef.field as keyof typeof inColumnFiltersConfig.gridFilters];
  return gridFilter?.initialQuerySpec?.filteringSpec ?? filterDef;
});