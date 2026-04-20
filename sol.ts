 adapterAgg: 'sum',       // ← single source of truth

 // aggregation.ts

export type AggFn = 'sum' | 'min' | 'max' | 'first' | 'last';

export interface AggConfig {
  field: string;
  aggFn: AggFn;
}

export const aggregate = (values: number[], fn: AggFn): number | undefined => {
  const nums = values.filter(v => v != null && !isNaN(v));
  if (nums.length === 0) return undefined;
  switch (fn) {
    case 'sum':   return nums.reduce((a, b) => a + b, 0);
    case 'min':   return Math.min(...nums);
    case 'max':   return Math.max(...nums);
    case 'first': return nums[0];
    case 'last':  return nums[nums.length - 1];
  }
};

export const buildAggConfigs = (
  fields: Record<string, { adapterAgg?: AggFn }>
): AggConfig[] =>
  Object.entries(fields)
    .filter(([, v]) => v.adapterAgg != null)
    .map(([field, v]) => ({ field, aggFn: v.adapterAgg! }));

    export const adapterCreator: worker.AdapterCreator<BackendRow> =
  (_context: data.RowsStoreContext) => {
    const groups = new Map<string, BackendRow>();
    const aggConfigs = buildAggConfigs(fields); // fields imported directly

    const recomputeGroupAggs = (groupId: string): void => {
      const parent = groups.get(groupId);
      if (!parent) return;

      const childIds = parent[CHILDREN_FIELD] as string[];
      const childRows = childIds
        .map(id => _context.matched.get(id))
        .filter((r): r is BackendRow => r != null);

      aggConfigs.forEach(({ field, aggFn }) => {
        const values = childRows
          .map(r => r[field] as number)
          .filter(v => v != null && !isNaN(v));
        const result = aggregate(values, aggFn);
        if (result !== undefined) parent[field] = result;
      });
    };

    const getOrCreateGroupParent = (groupId: string): BackendRow => {
      let parent = groups.get(groupId);
      if (!parent) {
        const date = groupId === UNKNOWN_GROUP_KEY ? null : groupId;
        const displayDate = groupId === UNKNOWN_GROUP_KEY ? UNKNOWN_GROUP_DISPLAY : groupId;
        const comparableDate = data.makeDateComparable(date, GROUP_DISPLAY_FORMAT);
        parent = {
          id: groupId,
          [GROUP_BY_FIELD_FORMATTED]: displayDate,
          [GROUP_BY_FIELD_COMPARABLE]: comparableDate,
          [PATH_FIELD]: [groupId],
          [CHILDREN_FIELD]: [] as string[],
        } as BackendRow;
        groups.set(groupId, parent);
      }
      return parent;
    };

    const assignRowIdToGroupId = (rowId: string, groupId: string): void => {
      const parent = getOrCreateGroupParent(groupId);
      const children = parent[CHILDREN_FIELD]!;
      if (!children.includes(rowId)) children.push(rowId);
    };

    const removeRowIdFromGroup = (row: BackendRow): void => {
      const groupId = getGroupId(row[GROUP_BY_FIELD]);
      const parent = groups.get(groupId);
      if (!parent) return;
      const children = parent[CHILDREN_FIELD]!.filter(id => id !== row.id);
      if (children.length === 0) groups.delete(groupId);
      else parent[CHILDREN_FIELD] = children;
    };

    const processAddRow = (row: BackendRow): BackendRow => {
      const groupId = getGroupId(row[GROUP_BY_FIELD]);
      assignRowIdToGroupId(row.id, groupId);
      row[PATH_FIELD] = [groupId, row.id];
      recomputeGroupAggs(groupId);
      return row;
    };

    const processUpdateRow = (row: BackendRow): BackendRow => {
      const rowId = row.id;
      const value = row[GROUP_BY_FIELD];
      if (value !== undefined) {
        const newGroupId = getGroupId(value);
        const oldGroupId = [...groups.values()]
          .find(parent => parent[CHILDREN_FIELD]?.includes(rowId))?.id;
        if (oldGroupId && oldGroupId !== newGroupId) {
          removeRowIdFromGroup(row);
          recomputeGroupAggs(oldGroupId);
        }
        assignRowIdToGroupId(rowId, newGroupId);
        recomputeGroupAggs(newGroupId);
      }
      return row;
    };

    const processRemoveRow = (row: BackendRow): BackendRow => {
      const groupId = getGroupId(row[GROUP_BY_FIELD]);
      removeRowIdFromGroup(row);
      recomputeGroupAggs(groupId);
      return row;
    };

    return {
      clear: () => { groups.clear(); },
      getParentId: (child: BackendRow) => getParentGroupId(child),
      getParent: (child: BackendRow) => groups.get(getParentGroupId(child)),
      getChildrenIds: (parent: BackendRow) => {
        const childrenIds = groups.get(parent.id)?.[CHILDREN_FIELD];
        return childrenIds && childrenIds.length > 0
          ? (childrenIds as [string, ...string[]])
          : ([parent.id] as [string, ...string[]]);
      },
      getRowDeltaMessage: (json: any) => ({
        ...json,
        add: json?.add?.map(processAddRow),
        update: json?.update?.map(processUpdateRow),
        remove: json?.remove?.map(processRemoveRow),
      }),
    };
  };