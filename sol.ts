const withParentSorting = (
  comparator: sorting.SortComparator<data.UnknownRow>,
  field: string,
): sorting.SortComparator<data.UnknownRow> => {
  const firstChildWithField = (parent: data.UnknownRow): data.UnknownRow => {
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
    const effectiveA = childToParent.get(rowA.id) ?? rowA;
    const effectiveB = childToParent.get(rowB.id) ?? rowB;
    if (effectiveA.id !== effectiveB.id) {
      return comparator(firstChildWithField(effectiveA), firstChildWithField(effectiveB));
    }
    return comparator(rowA, rowB);
  };
};