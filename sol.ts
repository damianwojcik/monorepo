const withParentSorting = (
  comparator: sorting.SortComparator<data.UnknownRow>,
  sortField: SorterDef,  // pass this in
): sorting.SortComparator<data.UnknownRow> => {
  const field = sortField.field;
  const direction = sortField.direction;

  // Resolve a value for any row — parent or child — for this field.
  const resolveValue = (row: data.UnknownRow): unknown => {
    const direct = row[field];
    if (direct !== undefined) return direct;

    // Parent without this field: derive from children.
    const childIds = row[CHILDREN_FIELD] as string[] | undefined;
    if (!childIds) return undefined;

    let best: unknown = undefined;
    for (const childId of childIds) {
      const child = map.get(childId);
      if (!child) continue;
      const v = child[field];
      if (v === undefined) continue;
      if (best === undefined) { best = v; continue; }
      // For ascending sort, parent should represent the min of children
      // (so the group with the earliest child sorts first); for descending, max.
      const cmp = comparator(
        { [field]: v } as data.UnknownRow,
        { [field]: best } as data.UnknownRow,
      );
      if (cmp < 0) best = v;
    }
    return best;
  };

  return (rowA, rowB) => {
    const effectiveA = childToParent.get(rowA.id) ?? rowA;
    const effectiveB = childToParent.get(rowB.id) ?? rowB;

    if (effectiveA.id !== effectiveB.id) {
      // Compare parents by their resolved values
      const va = resolveValue(effectiveA);
      const vb = resolveValue(effectiveB);
      return comparator(
        { [field]: va } as data.UnknownRow,
        { [field]: vb } as data.UnknownRow,
      );
    }
    return comparator(rowA, rowB);
  };
};