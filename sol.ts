export const convertGridFilterModelToFilteringSpec = (
  model: FilterModel,
  gridFilters: GridFilters,
  resetToInitial = false,
): FilteringSpec => {
  const result: FilteringSpec = [];

  for (const [colId, gridFilter] of Object.entries(gridFilters ?? {})) {
    if (!gridFilter) {
      continue;
    }

    const values = model[colId]?.values;

    if (values?.length) {
      result.push(...gridFilter.toFilteringSpec(values));
      continue;
    }

    if (resetToInitial) {
      result.push(
        ...(gridFilter.initialQuerySpec?.filteringSpec ?? []).filter(
          (matcher) => matcher !== undefined,
        ),
      );
    }
  }

  return result;
};