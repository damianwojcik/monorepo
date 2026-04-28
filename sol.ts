// Find the group parent from any context
let groupParent: BackendRow | undefined;
if (includeParent) {
  for (const context of allContexts) {
    groupParent = context.matchedParents.get(groupId) as BackendRow | undefined;
    if (groupParent) break;
  }

  if (groupParent) {
    for (const [fieldKey, aggFunc] of Object.entries(activeAggregations)) {
      const values = childRows
        .map((child) => (child as Record<string, unknown>)[fieldKey])
        .filter((v): v is number => typeof v === 'number');

      if (values.length > 0) {
        (groupParent as any)[fieldKey] = search.aggFunctions[aggFunc].fn(values);
      }
    }
  }
}