import {
  pathField,
  childrenField,
  getGroupId,
} from './temp-worker-extension-adapter';

type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

// Deterministic id from path so AG Grid preserves expand state across renders.
const parentIdForPath = (path: string[]): string =>
  `__grp__${path.join('|')}`;

export const extendRowsMapper = <TRow extends data.UnknownRow>(
  prevRowsMapper: worker.RowsMapper<TRow>,
  options?: ExtendRowsMapperOptions,
): worker.RowsMapper<TRow> => {
  const groupByFields = options?.groupByFields ?? [];
  if (groupByFields.length === 0) {
    return prevRowsMapper;
  }

  return (allContexts, rows, maxRows, includeParent) => {
    type Tuple = ReturnType<worker.RowsMapper<TRow>>[number];

    const tuplesWithoutParent = prevRowsMapper(
      allContexts,
      rows,
      Number.POSITIVE_INFINITY,
      false,
    );
    const rowsToGroup = tuplesWithoutParent.flat();

    type TreeNode = {
      groupId: string;
      level: number;
      parentId: string;
      parentRow: TRow;
      children: Map<string, TreeNode>;
      rows: TRow[];
      order: string[];
    };

    const buildParentFields = (
      level: number,
      groupId: string,
    ): Record<string, unknown> => {
      const fields: Record<string, unknown> = {};
      for (let i = 0; i < groupByFields.length; i++) {
        const field = groupByFields[i]!;
        fields[field] = i === level ? groupId : null;
      }
      return fields;
    };

    const synthesizeParent = (
      level: number,
      groupId: string,
      groupPath: string[],
      ancestorIds: string[],
    ): TRow => {
      const id = parentIdForPath(groupPath);
      return {
        id,
        ...buildParentFields(level, groupId),
        [pathField]: [...ancestorIds, id],
        [childrenField]: [] as string[],
      } as unknown as TRow;
    };

    const root: TreeNode = {
      groupId: '__root__',
      level: -1,
      parentId: '',
      parentRow: {} as TRow,
      children: new Map(),
      rows: [],
      order: [],
    };

    for (const row of rowsToGroup) {
      let node = root;
      const ancestorIds: string[] = [];
      const groupPathSoFar: string[] = [];
      for (let level = 0; level < groupByFields.length; level++) {
        const groupId = getGroupId(
          (row as Record<string, any>)[groupByFields[level]!],
        );
        groupPathSoFar.push(groupId);
        let child = node.children.get(groupId);
        if (!child) {
          const parentRow = synthesizeParent(
            level,
            groupId,
            [...groupPathSoFar],
            ancestorIds,
          );
          child = {
            groupId,
            level,
            parentId: (parentRow as Record<string, any>).id,
            parentRow,
            children: new Map(),
            rows: [],
            order: [],
          };
          node.children.set(groupId, child);
          node.order.push(groupId);
          // Register this parent as a child of its parent (one level up).
          if (node.level >= 0) {
            const parentChildren = (node.parentRow as Record<string, any>)[
              childrenField
            ] as string[];
            parentChildren.push(child.parentId);
          }
        }
        ancestorIds.push(child.parentId);
        node = child;
      }
      node.rows.push(row);
      const leafChildren = (node.parentRow as Record<string, any>)[
        childrenField
      ] as string[];
      leafChildren.push(row.id);
      (row as Record<string, any>)[pathField] = [...ancestorIds, row.id];
    }

    const tuples: Tuple[] = [];
    let rowsCount = 0;

    const walk = (node: TreeNode): boolean => {
      if (node.level >= 0) {
        if (rowsCount + 1 > maxRows) {
          return false;
        }
        tuples.push([node.parentRow] as Tuple);
        rowsCount += 1;
      }

      if (node.level === groupByFields.length - 1) {
        if (node.rows.length === 0) {
          return true;
        }
        if (rowsCount + node.rows.length > maxRows) {
          return false;
        }
        tuples.push([...node.rows] as Tuple);
        rowsCount += node.rows.length;
        return true;
      }

      for (const childGroupId of node.order) {
        const child = node.children.get(childGroupId)!;
        const cont = walk(child);
        if (!cont) {
          return false;
        }
      }
      return true;
    };

    for (const topGroupId of root.order) {
      const topNode = root.children.get(topGroupId)!;
      const cont = walk(topNode);
      if (!cont) {
        break;
      }
    }

    return tuples;
  };
};