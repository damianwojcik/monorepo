export const initialFilteringSpec: FilteringSpec = 
  Object.values(gridFilters)
    .flatMap(config => config?.defaultMatcher ? [config.defaultMatcher] : []);