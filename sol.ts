const mergeChildRow = (rowId: string, row: BackendRow) => {
  const existing = childRows.get(rowId);
  if (!existing) {
    // Parse string values for agg fields on initial set too
    for (const [key, val] of Object.entries(row)) {
      if (key in aggregationConfig && typeof val === 'string') {
        const parsed = parseFloat(val);
        if (!Number.isNaN(parsed)) {
          (row as Record<string, unknown>)[key] = parsed;
        }
      }
    }
    childRows.set(rowId, row);
    return;
  }
  for (const [key, val] of Object.entries(row)) {
    (existing as Record<string, unknown>)[key] =
      key in aggregationConfig && typeof val === 'string'
        ? Number.isNaN(parseFloat(val))
          ? val
          : parseFloat(val)
        : val;
  }
};