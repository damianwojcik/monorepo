// 1. Improve the GridFilter type to actually describe the shape
type GridFilter = {
  values: Record<string, unknown>;
  toFilteringSpec: (values: string[]) => FilteringSpec[]; // adjust return type to match yours
  fromFilteringSpec: () => Record<string, unknown>;
};

// 2. In your handler, the null check you already have is fine,
//    but TS needs it before accessing .toFilteringSpec:
const newFilteringSpecs = Object.entries(filterModel).flatMap(([colId, value]) => {
  const gridFilter = gridFilters[colId as keyof typeof gridFilters];
  if (!gridFilter) {
    console.warn('No gridFilter found for', colId);
    return [];
  }
  // TS now knows gridFilter is defined here
  return gridFilter.toFilteringSpec(value.values);
});