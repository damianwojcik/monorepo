
export type CombinedComparator = (idA: string, idB: string) => number;
const CHILDREN_FIELD = '#children';

export const createCombinedComparator = (
  config: worker.InternalConfig,
  sorters: SortingSpec,
  map: Map<string, data.UnknownRow>,
  parentsMap: Map<string, data.UnknownRow>,
): CombinedComparator | null => {
  const childToParent = new Map<string, data.UnknownRow>();
  for (const [, parent] of parentsMap) {
    const children = parent[CHILDREN_FIELD] as string[] | undefined;
    if (children) {
      for (const childId of children) {
        childToParent.set(childId, parent);
      }
    }
  }

  const withParentSorting = (
    comparator: sorting.SortComparator<data.UnknownRow>,
    field: string,
  ): sorting.SortComparator<data.UnknownRow> => {
    // For a parent row, find a child that has the field and use it as a stand-in.
    const parentProxy = (parent: data.UnknownRow): data.UnknownRow => {
      if (parent[field] !== undefined) return parent;
      const childIds = parent[CHILDREN_FIELD] as string[] | undefined;
      if (!childIds) return parent;
      for (const childId of childIds) {
        const child = map.get(childId);
        if (child && child[field] !== undefined) return child;
      }
      return parent;
    };

    return (rowA, rowB) => {
      const parentA = childToParent.get(rowA.id);
      const parentB = childToParent.get(rowB.id);
      const effectiveA = parentA ?? rowA;
      const effectiveB = parentB ?? rowB;

      if (effectiveA.id !== effectiveB.id) {
        // Different groups → compare parents (using a child proxy if parent lacks the field)
        return comparator(parentProxy(effectiveA), parentProxy(effectiveB));
      }
      // Same group → compare children directly
      return comparator(rowA, rowB);
    };
  };

  const createFieldCompare = (sortField: SorterDef): sorting.SortComparator<data.UnknownRow> => {
    const { direction: sortDirection } = sortField;
    const field = sortField.field;
    const fieldSortConfig = config.fields[field]?.search?.sort;
    if (!fieldSortConfig) {
      return sorting.dummyComparator;
    }

    const comparator = createSortComparator(sortDirection, fieldSortConfig);
    if (!config.enableGroupingParentRowsSorting) {
      return comparator;
    }
    return withParentSorting(comparator, field);
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

const createSortComparator = (
  sortDirection: SorterDef['direction'],
  sortConfig: NonNullable<NonNullable<worker.ConfigField['search']>['sort']>,
) => {
  const direction = sortDirection === sorting.SortDirectionAscending ? sorting.B1st : sorting.A1st;
  if ('simple' in sortConfig) {
    return withDirection(sortConfig.simple, direction);
  }
  if ('directional' in sortConfig) {
    return sortConfig.directional(direction);
  }
  return sorting.dummyComparator;
};