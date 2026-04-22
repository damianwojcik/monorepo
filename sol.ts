const withParentSorting = (
  comparator: sorting.SortComparator<data.UnknownRow>,
  aggField?: string,
  aggFunc?: string,
): sorting.SortComparator<data.UnknownRow> => {
  return (rowA: data.UnknownRow, rowB: data.UnknownRow) => {
    const parentA = childToParent?.get(rowA.id as string);
    const parentB = childToParent?.get(rowB.id as string);

    if (parentA && parentB) {
      if (parentA === parentB) return sorting.Tie;

      // If field has aggregation, compare using the active agg value
      if (aggField && aggFunc) {
        const aggA = (parentA as any)[aggField]?.[aggFunc] as number ?? 0;
        const aggB = (parentB as any)[aggField]?.[aggFunc] as number ?? 0;
        if (aggA < aggB) return -1 as sorting.ComparatorResult;
        if (aggA > aggB) return 1 as sorting.ComparatorResult;
        return sorting.Tie;
      }

      return comparator(parentA, parentB);
    }

    return comparator(rowA, rowB);
  };
};

const createFieldCompare = (sortField: SorterDef): sorting.SortComparator<data.UnknownRow> => {
  const { direction: sortDirection } = sortField;

  const field = sortField.field;
  const fieldConfig = config.fields[field];
  const sortConfig = fieldConfig?.search?.sort;

  if (!sortConfig) return sorting.dummyComparator;

  const comparator = createSortComparator(sortDirection, sortConfig);

  if (!config.enableParentSorting) {
    return comparator;
  }

  const adapterAggFunc = fieldConfig?.adapterAggFunc;
  if (adapterAggFunc) {
    // Field has aggregation — sort parents by their active agg value
    // Agg object key convention: fieldName + 'Agg' e.g. 'deltaSize' -> 'deltaSizeAgg'
    const aggField = field + 'Agg';
    return withParentSorting(comparator, aggField, adapterAggFunc);
  }

  // Parent sorting without aggregation
  return withParentSorting(comparator);
};