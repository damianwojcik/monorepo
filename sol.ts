return Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
  const values = model[colId]?.values;

  if (values?.length) {
    return gridFilter.toFilteringSpec(values);
  }

  if (resetToInitial) {
    return (gridFilter.initialQuerySpec?.filteringSpec ?? []).filter(
      (x): x is Matcher => Boolean(x)
    );
  }

  return [];
});