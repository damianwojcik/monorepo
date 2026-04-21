const existing = childRows.get(rowId);
if (existing) {
  for (const [key, val] of Object.entries(row)) {
    if (key in aggregationConfig && typeof val === 'string') {
      (existing as any)[key] = parseFloat(val);
    } else {
      (existing as any)[key] = val;
    }
  }
} else {
  childRows.set(rowId, row);
}