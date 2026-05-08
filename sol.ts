const withParentSorting = (
  comparator: sorting.SortComparator<data.UnknownRow>,
  field: string,
): sorting.SortComparator<data.UnknownRow> => {
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
    const parentA = childToParent.get(rowA.id) ?? rowA;
    const parentB = childToParent.get(rowB.id) ?? rowB;

    if (parentA.id !== parentB.id) {
      // Different groups → order by parent's proxy value
      return comparator(parentProxy(parentA), parentProxy(parentB));
    }
    // Same group → order children by the field directly
  const result = comparator(rowA, rowB);
  console.log('!!! child-vs-child', { aId: rowA.id, bId: rowB.id, aValue: rowA[field], bValue: rowB[field], parent: parentA.id, result });
  return result;
  };
};