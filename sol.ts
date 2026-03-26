const initialSortingSpec = useMemo(
  () =>
    Object.values(gridFilters ?? {}).flatMap(
      (config) => config.initialQuerySpec?.sortingSpec ?? []
    ),
  [gridFilters]
);