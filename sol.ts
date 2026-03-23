export const initialFilteringSpec: FilteringSpec = Object.values(gridFilters).flatMap(
  (config: GridFilter | undefined) =>
    config?.defaultMatcher ? [config.defaultMatcher] : [],
);

export const initialSortingSpec = fromFacetedSearchSorters(
  Object.values(gridFilters).flatMap(
    (config: GridFilter | undefined) =>
      config?.defaultSorter ? [config.defaultSorter] : [],
  ),
);