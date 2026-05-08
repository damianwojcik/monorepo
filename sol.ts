
export type CombinedComparator = (idA: string, idB: string) => number;
const CHILDREN_FIELD = '#children';

export const createCombinedComparator = (
  config: worker.InternalConfig,
  sorters: SortingSpec,
  map: Map<string, data.UnknownRow>,
  parentsMap: Map<string, data.UnknownRow>,
): CombinedComparator | null => {
  console.log('!!! createCombinedComparator called', {
    sortersCount: sorters?.length,
    sorters,
    parentsMapSize: parentsMap.size,
    mapSize: map.size,
    enableGroupingParentRowsSorting: config.enableGroupingParentRowsSorting,
  });

  const childToParent = new Map<string, data.UnknownRow>();
  for (const [, parent] of parentsMap) {
    const children = parent[CHILDREN_FIELD] as string[] | undefined;
    if (children) {
      for (const childId of children) {
        childToParent.set(childId, parent);
      }
    }
  }
  console.log('!!! childToParent built', { size: childToParent.size });

  const withParentSorting = (
    comparator: sorting.SortComparator<data.UnknownRow>,
    sortField: SorterDef,
  ): sorting.SortComparator<data.UnknownRow> => {
    const field = sortField.field;

    const resolveValue = (row: data.UnknownRow): unknown => {
      const direct = row[field];
      if (direct !== undefined) {
        return direct;
      }

      const childIds = row[CHILDREN_FIELD] as string[] | undefined;
      if (!childIds) {
        console.log('!!! resolveValue: parent has no children and no field', { rowId: row.id, field });
        return undefined;
      }

      let best: unknown = undefined;
      for (const childId of childIds) {
        const child = map.get(childId);
        if (!child) {
          console.log('!!! resolveValue: child id not in map', { parentId: row.id, childId });
          continue;
        }
        const v = child[field];
        if (v === undefined) continue;
        if (best === undefined) {
          best = v;
          continue;
        }
        const cmp = comparator(
          { [field]: v } as data.UnknownRow,
          { [field]: best } as data.UnknownRow,
        );
        if (cmp < 0) {
          best = v;
        }
      }

      if (best === undefined) {
        console.log('!!! resolveValue: no child had the field', { parentId: row.id, field, childCount: childIds.length });
      }

      return best;
    };

    return (rowA, rowB) => {
      const effectiveA = childToParent.get(rowA.id) ?? rowA;
      const effectiveB = childToParent.get(rowB.id) ?? rowB;

      if (effectiveA.id !== effectiveB.id) {
        const va = resolveValue(effectiveA);
        const vb = resolveValue(effectiveB);

        if (va === undefined || vb === undefined) {
          console.log('!!! parent compare with undefined value', {
            aId: effectiveA.id, va,
            bId: effectiveB.id, vb,
            field,
          });
        }

        return comparator(
          { [field]: va } as data.UnknownRow,
          { [field]: vb } as data.UnknownRow,
        );
      }

      return comparator(rowA, rowB);
    };
  };

  const createFieldCompare = (sortField: SorterDef): sorting.SortComparator<data.UnknownRow> => {
    const { direction: sortDirection } = sortField;
    const field = sortField.field;
    const fieldSortConfig = config.fields[field]?.search?.sort;

    console.log('!!! createFieldCompare', {
      field,
      sortDirection,
      hasFieldSortConfig: !!fieldSortConfig,
      enableGroupingParentRowsSorting: config.enableGroupingParentRowsSorting,
    });

    if (!fieldSortConfig) {
      console.log('!!! createFieldCompare: returning dummyComparator', { field });
      return sorting.dummyComparator;
    }

    const comparator = createSortComparator(sortDirection, fieldSortConfig);
    if (!config.enableGroupingParentRowsSorting) {
      console.log('!!! createFieldCompare: parent sorting DISABLED, returning bare comparator', { field });
      return comparator;
    }

    console.log('!!! createFieldCompare: wrapping with withParentSorting', { field });
    return withParentSorting(comparator, sortField);
  };

  const comparators = sorters?.map(createFieldCompare).filter(Boolean) ?? [];
  console.log('!!! comparators built', { count: comparators.length });

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