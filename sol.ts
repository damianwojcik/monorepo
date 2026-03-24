useEffect(() => {
  if (!storageLoaded.current && filteringSpec) {
    storageLoaded.current = true;

    const correctedSpec = filteringSpec.map(matcher => {
      const gridFilter = gridFilters?.[matcher.field];
      return gridFilter?.initialMatcher ?? matcher;
    });

    updateQuerySpec(filters.PROPELLANT_V1_FILTERING_SPEC, {
      filteringSpec: correctedSpec,
    });
    return;
  }
}, [filteringSpec]);