
export type CombinedComparator = (idA: string, idB: string) => number;

const createComparator = (sortDirection: any, sortConfig: any) => {
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
  const withAggregation = (
    comparator: sorting.SortComparator<data.UnknownRow>,
  ): sorting.SortComparator<data.UnknownRow> => {
    return (rowA: data.UnknownRow, rowB: data.UnknownRow) => {
      const parentA = parentsMap.get(rowA.id as string);
      const parentB = parentsMap.get(rowB.id as string);

      if (parentA && parentB) {
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
      const comparator = createComparator(sortDirection, sortConfig);
      if (!comparator) return sorting.dummyComparator;
      return adapterAggFunc
        ? withAggregation(comparator)
        : comparator;
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

const withDirection = (comparator: sorting.SortComparator<data.UnknownRow>, direction: sorting.SortDirection2) =>
  (a: data.UnknownRow, b: data.UnknownRow) => (direction * comparator(a, b)) as sorting.ComparatorResult;