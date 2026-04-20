const processAddRow = (row: BackendRow): BackendRow => {
  const groupId = getGroupId(row[GROUP_BY_FIELD]);
  assignRowIdToGroupId(row.id, groupId);
  row[PATH_FIELD] = [groupId, row.id];

  console.log('!!! processAddRow - row:', row.id, 'groupId:', groupId);
  console.log('!!! is row in _context.matched?', _context.matched.has(row.id));

  recalculateParent(groupId);

  return row;
};

const recalculateParent = (groupId: string) => {
  const parent = groups.get(groupId);
  if (!parent) return;

  const childIds = parent[CHILDREN_FIELD]!;
  const children = childIds
    .map((id) => _context.matched.get(id))
    .filter((r): r is BackendRow => r !== undefined);

  console.log('!!! recalculateParent - groupId:', groupId, 'children count:', children.length);

  if (children.length > 0) {
    const aggValues = computeAggregatedValues(children, aggConfig);
    console.log('!!! aggValues:', aggValues);
    Object.assign(parent, aggValues);
    console.log('!!! parent after aggregation:', parent);
  }
};