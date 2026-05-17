} else {
  // Row isn't under any group (e.g. added before grouping was on).
  // Nothing to detach - prevAdapter already removed the row data.
  console.log('!!! processRemoveRow: row not in any group, skipping', row.id);
}

/** Remove rowId from one group's children list. Returns the new length. */
const detachChild = (group: TRow, rowId: string): number => {
  const next = getGroupChildren(group).filter((id) => id !== rowId);
  (group as GroupRow)[childrenField] = next;
  return next.length;
};

/** Delete a group and unlink it from its parent. */
const deleteGroup = (group: GroupRow): void => {
  groups.delete(group.id);
  console.log('!!! deleted empty group', group.id);
  const parent = getRowParentRow(group.id); // the link you already have
  if (parent) detachChild(parent, group.id);
};

const removeRowFromGroups = (rowId: string, parent: GroupRow): void => {
  // Job A: detach the row from its direct parent.
  detachChild(parent, rowId);
  console.log('!!! removed row', rowId, 'from group', parent.id);

  // Job B: walk up, deleting groups that became empty.
  let current: GroupRow | undefined = parent;
  while (current && getGroupChildren(current).length === 0) {
    const grandparent = getRowParentRow(current.id);
    deleteGroup(current);
    current = grandparent;
  }
};