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

  const existing = childRows.get(rowId);
  if (existing) {
    Object.assign(existing, row);
  } else {
    childRows.set(rowId, row);
  }

  // Only recalculate if the update touches any aggregated field
  const hasAggField = Object.keys(row).some((key) => key in aggConfig);
  if (hasAggField) {
    const parentGroupId = getParentGroupId(row);
    if (parentGroupId) {
      console.log('!!! processUpdateRow - recalculating, row:', rowId, 'parentGroupId:', parentGroupId);
      recalculateParent(parentGroupId);
    }
  }

  return row;
};