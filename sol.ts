const initialSortingSpec = useMemo(
  () =>
    Object.values(inColumnFiltersConfig.gridFilters ?? {}).flatMap(config =>
      'initialQuerySpec' in config ? (config?.initialQuerySpec?.sortingSpec ?? []) : []
    ),
  [],
);

const {
  items: {
    isin: [isin],
  },
} = useSharedIdentifierContext<ContextItems>();

useEffect(() => {
  if (!storageLoaded.current && filteringSpec && sortingSpec) {
    storageLoaded.current = true;

    const initialFilteringSpec = filteringSpec.map(filterDef => {
      const gridFilter = inColumnFiltersConfig.gridFilters?.[filterDef.field];
      return gridFilter?.initialMatcher ?? filterDef;
    });

    updateQuerySpec(PROPELLANT_V1_FILTERING_SPEC, {
      filteringSpec: initialFilteringSpec,
    });
    updateQuerySpec(FACETED_SEARCH_V1_FILTERING_SPEC, {
      sortingSpec: initialSortingSpec,
    });

    return;
  }
}, [filteringSpec, sortingSpec]);