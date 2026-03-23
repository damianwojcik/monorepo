for (const [field, extendedColDef] of Object.entries(extendedColDefs)) {
  const gridFilter = gridFilters?.[field];
  const defaultValues = gridFilter?.defaultMatcher
    ? gridFilter.fromFilteringSpecToGridFilterModel(gridFilter.defaultMatcher)?.[field]?.values
    : undefined;

  columnDefsDictionary[field] = {
    ...columnDefsDictionary[field],
    ...extendedColDef,
    ...(defaultValues && extendedColDef.filterParams && {
      filterParams: {
        ...extendedColDef.filterParams,
        defaultSelection: defaultValues,
      },
    }),
    suppressHeaderMenuButton: true,
  };
}