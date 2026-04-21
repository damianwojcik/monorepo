const processUpdateRow = (row: BackendRow): BackendRow => {
  const rowId = row.id;
  const value = row[GROUP_BY_FIELD];

  if (value !== undefined) {
    const newGroupId = getGroupId(value);
    const oldGroupId = [...groups.values()].find(parent => parent[CHILDREN_FIELD]?.includes(rowId))?.id;
    if (oldGroupId && oldGroupId !== newGroupId) {
      removeRowIdFromGroup(row);
      childRows.delete(rowId);
      console.log('!!! processUpdateRow - row moved groups, old:', oldGroupId, 'new:', newGroupId);
      recalculateParent(oldGroupId);
    }
    assignRowIdToGroupId(rowId, newGroupId);
  }

  // Merge partial update into existing stored row
  const existing = childRows.get(rowId);
  if (existing) {
    Object.assign(existing, row);
  } else {
    childRows.set(rowId, row);
  }

  const parentGroupId = getParentGroupId(row);
  if (parentGroupId) {
    console.log('!!! processUpdateRow - row:', rowId, 'parentGroupId:', parentGroupId);
    recalculateParent(parentGroupId);
  }

  return row;
};