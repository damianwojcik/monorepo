import type { ValueGetterParams } from 'ag-grid-community';

export const numericValueGetter = (params: ValueGetterParams): number | null => {
  const field = params.colDef.field ?? params.column.getColId();
  const raw = params.data?.[field];

  if (raw == null || raw === '') return null;

  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};