
import {
  getGroupId,
  pathField,
  childrenField,
} from './temp-worker-extension-adapter';

type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

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
      parentId: string; // id of the synthesized parent row at this level
      parentRow: TRow; // synthesized parent row
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
      ancestorIds: string[],
    ): TRow => {
      const id = uid();
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
      for (let level = 0; level < groupByFields.length; level++) {
        const groupId = getGroupId(
          (row as Record<string, any>)[groupByFields[level]!],
        );
        let child = node.children.get(groupId);
        if (!child) {
          const parentRow = synthesizeParent(level, groupId, ancestorIds);
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
        }
        ancestorIds.push(child.parentId);
        node = child;
      }
      node.rows.push(row);
      // Track this row as a child of the leaf parent
      const leafChildren = (node.parentRow as Record<string, any>)[
        childrenField
      ] as string[];
      leafChildren.push(row.id);
      // Patch the row's #path to use our synthesized parent ids
      (row as Record<string, any>)[pathField] = [...ancestorIds, row.id];
    }

    const tuples: Tuple[] = [];
    let rowsCount = 0;

    const walk = (
      node: TreeNode,
      parentsSoFar: TRow[],
    ): boolean => {
      if (node.level === groupByFields.length - 1) {
        if (node.rows.length === 0) {
          return true;
        }
        const tuple: TRow[] = [];
        if (includeParent) {
          tuple.push(...parentsSoFar);
        }
        tuple.push(node.parentRow);
        tuple.push(...node.rows);

        if (rowsCount + tuple.length > maxRows) {
          return false;
        }
        rowsCount += tuple.length;
        tuples.push(tuple as Tuple);
        return true;
      }

      for (const childGroupId of node.order) {
        const child = node.children.get(childGroupId)!;
        const nextParents = includeParent
          ? [...parentsSoFar, node.parentRow]
          : parentsSoFar;
        // For top-level (level 0) children, the "parent" is the synthesized
        // level-0 parent itself, not root. So we start parentsSoFar empty and
        // push as we descend.
        const cont = walk(child, nextParents);
        if (!cont) {
          return false;
        }
      }
      return true;
    };

    for (const topGroupId of root.order) {
      const topNode = root.children.get(topGroupId)!;
      // Top-level parent has no ancestors yet
      const cont = walk(topNode, []);
      if (!cont) {
        break;
      }
    }

    return tuples;
  };
};