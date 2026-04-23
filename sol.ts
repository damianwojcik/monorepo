type AggFunc = 'none' | 'avg' | 'count' | 'first' | 'last' | 'max' | 'min' | 'sum';

function buildAggSubMenu(params): MenuItemDef[] {
  const col = params.column;
  const currentAgg = col.getAggFunc() ?? 'none';

  const options: { label: string; value: AggFunc }[] = [
    { label: 'None',    value: 'none'  },
    { label: 'Average', value: 'avg'   },
    { label: 'Count',   value: 'count' },
    { label: 'First',   value: 'first' },
    { label: 'Last',    value: 'last'  },
    { label: 'Max',     value: 'max'   },
    { label: 'Min',     value: 'min'   },
    { label: 'Sum',     value: 'sum'   },
  ];

  return options.map(({ label, value }) => ({
    name: label,
    // Checkmark on the active one
    icon: value === currentAgg
      ? '<span class="ag-icon ag-icon-tick"/>'
      : '<span style="display:inline-block;width:12px"/>',
    action: () => {
      if (value === 'none') {
        params.api.applyColumnState({
          state: [{ colId: col.getId(), aggFunc: null }],
        });
      } else {
        params.api.applyColumnState({
          state: [{ colId: col.getId(), aggFunc: value }],
        });
      }
      // Re-render to update checkmark
      params.api.refreshHeader();
    },
  }));
}


    {
      name: 'Value Aggregation',
      icon: '<span class="ag-icon ag-icon-aggregation"/>',
      subMenu: buildAggSubMenu(params),
    },