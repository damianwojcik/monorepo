const newFilterModel = Object.fromEntries(
  filteringSpec?.flatMap(matcher => {
    const gridFilter = gridFilters?.[matcher.field];
    if (!gridFilter) {
      logger.warn(`No grid filter found for colId: ${matcher.field}`);
      return [];
    }
    // TODO: rename /w 'matcher'
    const result = gridFilter?.fromFilteringSpecToGridFilterModel(matcher);
    return result ? Object.entries(result) : [];
  }) ?? []
);