import type { FilterModel, SetFilterModel } from 'ag-grid-community';

export type FilterDef = Matcher;
export type FilteringSpec = FilterDef[] | undefined;
export type Value = string | number;

type SetLikeFilterModel = SetFilterModel & {
  refresh?: boolean;
};

export type GridFilter = {
  toFilteringSpec: (values: string[]) => FilteringSpec;
  toGridFilterModel: (
    filterDef: FilterDef,
  ) => Record<string, SetLikeFilterModel> | null | undefined;
  initialQuerySpec?: {
    filteringSpec?: FilteringSpec;
    sortingSpec?: SortingSpec;
  };
};

export type GridFilters = Partial<Record<string, GridFilter>>;

export const convertGridFilterModelToFilteringSpec = (
  model: FilterModel,
  gridFilters?: GridFilters,
  resetToInitial = false,
): FilteringSpec => {
  if (!gridFilters) {
    return [];
  }

  if (resetToInitial) {
    return Object.values(gridFilters).flatMap(gridFilter => {
      if (!gridFilter) {
        return [];
      }

      return gridFilter.initialQuerySpec?.filteringSpec ?? [];
    });
  }

  return Object.entries(gridFilters).flatMap(([colId, gridFilter]) => {
    if (!gridFilter) {
      return [];
    }

    const columnModel = model[colId] as SetLikeFilterModel | undefined;
    const values = columnModel?.values;

    if (!values?.length) {
      return [];
    }

    return gridFilter.toFilteringSpec(values) ?? [];
  });
};

export const convertFilteringSpecToGridFilterModel = (
  filteringSpec: FilteringSpec | undefined,
  gridFilters?: GridFilters,
): FilterModel => {
  if (!filteringSpec?.length) {
    return {};
  }

  const filterModel: FilterModel = {};

  for (const filterDef of filteringSpec) {
    const gridFilter = gridFilters?.[filterDef.field];

    if (!gridFilter) {
      continue;
    }

    const result = gridFilter.toGridFilterModel(filterDef);

    if (!result) {
      continue;
    }

    for (const [key, val] of Object.entries(result)) {
      const existing = filterModel[key] as SetLikeFilterModel | undefined;

      filterModel[key] = {
        ...existing,
        ...val,
        values: [...(existing?.values ?? []), ...(val.values ?? [])],
        refresh: true,
      };
    }
  }

  return filterModel;
};