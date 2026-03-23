defaultSelection: [DateTimeFilter.OneMonth],

filterParams: {
  ...extendedColDef.filterParams,
  ...(gridFilter?.defaultSelection && { defaultSelection: gridFilter.defaultSelection }),
},