const withAggregation = (
  comparator: sorting.SortComparator<data.UnknownRow>,
): sorting.SortComparator<data.UnknownRow> => {
  return (rowA: data.UnknownRow, rowB: data.UnknownRow) => {
    const parentA = parentsMap.get(rowA.id as string);
    const parentB = parentsMap.get(rowB.id as string);

    console.log('!!! withAggregation', {
      idA: rowA.id,
      idB: rowB.id,
      isParentA: !!parentA,
      isParentB: !!parentB,
    });

    if (parentA && parentB) {
      const result = comparator(parentA, parentB);
      console.log('!!! parent compare result:', result);
      return result;
    }

    return comparator(rowA, rowB);
  };
};

const createFieldCompare = (sortField: SorterDef): sorting.SortComparator<data.UnknownRow> => {
  const { direction: sortDirection } = sortField;
  const field = sortField.field;
  const fieldConfig = config.fields[field];
  const sortConfig = fieldConfig?.search?.sort;
  const adapterAggFunc = config.fields[field]?.adapterAggFunc;

  console.log('!!! createFieldCompare', { field, adapterAggFunc, hasSortConfig: !!sortConfig });

  if (sortConfig) {
    const comparator = createComparator(sortDirection, sortConfig);
    if (!comparator) return sorting.dummyComparator;
    console.log('!!! using', adapterAggFunc ? 'withAggregation' : 'default comparator');
    return adapterAggFunc
      ? withAggregation(comparator)
      : comparator;
  }

  return sorting.dummyComparator;
};