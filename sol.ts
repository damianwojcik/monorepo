

// TODO: 'any'
const createSortComparator = (sortDirection: any, sortConfig: any) => {
  const direction = sortDirection === sorting.SortDirectionAscending ? 1 : -1;
  if ('simple' in sortConfig) {
    return withDirection(sortConfig.simple, direction);
  }
  if ('directional' in sortConfig) {
    return sortConfig.directional(direction);
  }
};

export const createCombinedComparator = (
  config: worker.InternalConfig,
  sorters: SortingSpec,
  map: Map<string, data.UnknownRow>,
  parentsMap: Map<string, data.UnknownRow>,
): CombinedComparator | null => {
  const childToParent = new Map<string, data.UnknownRow>();
  for (const [, parent] of parentsMap) {
    const children = (parent as any)['#children'] as string[] | undefined;
    if (children) {
      for (const childId of children) {
        childToParent.set(childId, parent);
      }
    }
  }

  const withAggregation = (
    comparator: sorting.SortComparator<data.UnknownRow>,
  ): sorting.SortComparator<data.UnknownRow> => {
    return (rowA: data.UnknownRow, rowB: data.UnknownRow) => {
      const parentA = childToParent.get(rowA.id as string);
      const parentB = childToParent.get(rowB.id as string);

      if (parentA && parentB) {
        if (parentA === parentB) return sorting.Tie;
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
    const adapterAggFunc = config.fields[field]?.adapterAggFunc;

    if (sortConfig) {
      return adapterAggFunc
        ? withAggregation(createSortComparator(sortDirection, sortConfig))
        : createSortComparator(sortDirection, sortConfig);
    }

    return sorting.dummyComparator;
  };

  const comparators = sorters?.map(createFieldCompare).filter(Boolean) ?? [];

  return comparators.length > 0
    ? (idA, idB) => {
        const rowA = map.get(idA)!;
        const rowB = map.get(idB)!;
        for (let comparator of comparators) {
          const result = comparator(rowA, rowB);
          if (result !== sorting.Tie) {
            return result;
          }
        }
        return 0;
      }
    : null;
};

