import { pathField } from './temp-worker-extension-adapter';

// Helper: which level is this row at?
// level-0 parent → #path.length === 1
// level-1 parent → #path.length === 2
// leaf          → #path.length === N+1 where N is groupByFields.length
const getRowLevel = (data: Record<string, unknown>): number => {
  const path = (data?.[pathField] as string[] | undefined) ?? [];
  return path.length - 1;
};

// Reusable factory for any groupBy column at a given level
const groupByColumnRenderer = (level: number) => ({
  cellRendererSelector: (params: { data?: Record<string, unknown> }) => {
    if (!params.data) {
      return undefined;
    }
    if (getRowLevel(params.data) === level) {
      return {
        component: 'agGroupCellRenderer',
        params: {
          suppressCount: true,
          suppressDoubleClickExpand: false,
        },
      };
    }
    return undefined; // default cell renderer for non-parent rows
  },
});

// SOURCE is groupByFields[0] → level 0
{
  field: 'SOURCE',
  headerName: 'Source',
  ...groupByColumnRenderer(0),
}

// TRANSACTION_FLAGS is groupByFields[1] → level 1
{
  field: 'TRANSACTION_FLAGS',
  headerName: 'Transaction Flags',
  ...groupByColumnRenderer(1),
}