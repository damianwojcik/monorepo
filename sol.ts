const recalculateParentAggValues = (groupId: string) => {
  const parent = groups.get(groupId);
  if (!parent) return;

  const childIds = parent[CHILDREN_FIELD]!;
  const children = childIds.map(id => childRows.get(id)).filter((r): r is BackendRow => r !== undefined);

  if (children.length > 0) {
    const aggValues = computeAggregatedValues(children, aggregationConfig);
    console.log('!!! recalculate - groupId:', groupId, 'before deltaSize:', parent.deltaSize, 'new deltaSize:', (aggValues as any).deltaSize);
    Object.assign(parent, aggValues);
    console.log('!!! recalculate - after deltaSize:', parent.deltaSize);
  }
};

for (const [id, parent] of groups) {
  context.matchedParents.set(id, parent);
  console.log('!!! sync matchedParents - id:', id, 'deltaSize:', (parent as any).deltaSize);
}