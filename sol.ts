for (const [field, colDef] of Object.entries(columnDefsDictionary)) {
  const extendedColDef = extendedColDefs[field];
  const gridFilter = gridFilters?.[field];

  const defaultValues = gridFilter?.initialMatcher
    ? gridFilter.toGridFilterModel(gridFilter.initialMatcher)?.[field]?.values
    : undefined;

  columnDefsDictionary[field] = {
    ...colDef,
    ...(extendedColDef && {
      ...extendedColDef,
      ...(defaultValues && extendedColDef.filterParams && {
        filterParams: {
          ...extendedColDef.filterParams,
          defaultSelection: defaultValues,
        },
      }),
    }),
    suppressHeaderMenuButton: true,
  };
}