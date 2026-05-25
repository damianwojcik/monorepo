 const groupingConfig = {
      region: {},
      currency: {},
    };
 
    const generateGroupingGridOptions = (groupingConfig) => {
      const groupByFields = Object.keys(groupingConfig);
 
      const buildPath = (row) => [
        ...groupByFields.map((field) => String(row[field])),
        row.id,
      ];
 
      const rowDataWithPath = rawRows.map((row) => ({
        ...row,
        '#path': buildPath(row),
      }));
 
      return {
        treeData: true,
        rowData: rowDataWithPath,
        getDataPath: (data) => data['#path'],
        getRowId: (params) => params.data.id,
        autoGroupColumnDef: {
          headerName: 'Group / Row',
          minWidth: 280,
          cellRendererParams: {
            suppressCount: false,
            innerRenderer: (params) => {
              if (params.node.group) {
                return params.node.key;
              }
              return params.data?.id ?? '';
            },
          },
        },
        groupDefaultExpanded: 1,
      };
    };
 
    const baseGridOptions = {
      columnDefs: [
        { field: 'date',     headerName: 'Date',     minWidth: 130 },
        { field: 'region',   headerName: 'Region',   minWidth: 110 },
        { field: 'currency', headerName: 'Currency', minWidth: 110 },
        { field: 'trader',   headerName: 'Trader',   minWidth: 160 },
        {
          field: 'price',
          headerName: 'Price',
          type: 'numericColumn',
          minWidth: 120,
          valueFormatter: (p) =>
            typeof p.value === 'number' ? p.value.toFixed(4) : '',
        },
      ],
      defaultColDef: {
        flex: 1,
        sortable: true,
        resizable: true,
        filter: true,
      },
      animateRows: true,
    };
 
    const groupingGridOptions = generateGroupingGridOptions(groupingConfig);
 
    const gridOptions = { ...baseGridOptions, ...groupingGridOptions };
 