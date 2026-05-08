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
    let bestFromChildId: string | undefined;
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
        bestFromChildId = childId;
        continue;
      }
      const cmp = comparator(
        { [field]: v } as data.UnknownRow,
        { [field]: best } as data.UnknownRow,
      );
      if (cmp < 0) {
        best = v;
        bestFromChildId = childId;
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