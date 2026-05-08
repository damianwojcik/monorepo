const withParentSorting = (
  comparator: sorting.SortComparator<data.UnknownRow>,
  field: string,
): sorting.SortComparator<data.UnknownRow> => {
  const parentProxy = (parent: data.UnknownRow): data.UnknownRow => {
    if (parent[field] !== undefined) return parent;
    const childIds = parent[CHILDREN_FIELD] as string[] | undefined;
    if (!childIds) {
      console.log('!!! parentProxy: parent has no children', { parentId: parent.id, field });
      return parent;
    }
    for (const childId of childIds) {
      const child = map.get(childId);
      if (child && child[field] !== undefined) return child;
    }
    console.log('!!! parentProxy: no child had the field', { parentId: parent.id, field });
    return parent;
  };

  return (rowA, rowB) => {
    const parentA = childToParent.get(rowA.id);
    const parentB = childToParent.get(rowB.id);
    const effectiveA = parentA ?? rowA;
    const effectiveB = parentB ?? rowB;

    if (effectiveA.id !== effectiveB.id) {
      const proxyA = parentProxy(effectiveA);
      const proxyB = parentProxy(effectiveB);
      const result = comparator(proxyA, proxyB);
      console.log('!!! parent-vs-parent compare', {
        aId: effectiveA.id,
        bId: effectiveB.id,
        aValue: proxyA[field],
        bValue: proxyB[field],
        field,
        result,
      });
      return result;
    }
    return comparator(rowA, rowB);
  };
};