postSortRows: (params) => {
  const nodes = params.nodes;
  if (!nodes.length) return;

  const sortedCol = params.api.getColumnState().find(c => c.sort);
  if (!sortedCol) return;

  const field = sortedCol.colId;
  const ascending = sortedCol.sort === 'asc';

  // Collect groups (parent + its children) preserving children order
  const groups: { parent: any; children: any[] }[] = [];
  let current: { parent: any; children: any[] } | null = null;

  for (const node of nodes) {
    if (node.data?.[Field.__Children]?.length > 0) {
      if (current) groups.push(current);
      current = { parent: node, children: [] };
    } else if (current) {
      current.children.push(node);
    }
  }
  if (current) groups.push(current);

  // Sort groups by parent's aggregated value only
  groups.sort((a, b) => {
    const valA = a.parent.data?.[field] ?? 0;
    const valB = b.parent.data?.[field] ?? 0;
    return ascending ? valA - valB : valB - valA;
  });

  // Rebuild nodes array
  let idx = 0;
  for (const group of groups) {
    nodes[idx++] = group.parent;
    for (const child of group.children) {
      nodes[idx++] = child;
    }
  }
},