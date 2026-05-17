import { DIVIDER } from './common';
import { childrenField, stringifyValue, pathField } from './common';

type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

/** A group node's id, derived from its path: "__grp__A--B". */
const parentIdForPath = (path: string[]): string =>
  `__grp__${path.join(DIVIDER)}`;

export const extendRowsMapper = <TRow extends data.UnknownRow>(
  prevRowsMapper: worker.RowsMapper<TRow>,
  options?: ExtendRowsMapperOptions,
): worker.RowsMapper<TRow> => {
  const groupByFields = options?.groupByFields ?? [];

  // No grouping configured -> nothing to do, just pass through.
  if (groupByFields.length === 0) {
    return prevRowsMapper;
  }

  /**
   * One node of the grouping tree we build to emit rows depth-first.
   *   - `groupRow` : the synthetic parent row for this node (null at root).
   *   - `children` : child nodes keyed by group id.
   *   - `order`    : child group ids in first-seen order (stable output).
   *   - `rows`     : real leaf data rows directly under this node.
   */
  type TreeNode = {
    groupRow: TRow | null;
    children: Map<string, TreeNode>;
    order: string[];
    rows: TRow[];
  };

  const createNode = (groupRow: TRow | null): TreeNode => ({
    groupRow,
    children: new Map(),
    order: [],
    rows: [],
  });

  /** Read a row's children-id list as a typed array (no casts at call sites). */
  const childrenOf = (row: TRow): string[] =>
    (row[childrenField] as string[] | undefined) ?? [];

  /**
   * Build the synthetic parent row for a group. Its id IS the path id; its
   * grouping fields are filled at this level only (deeper levels stay null).
   * `buildParentFields` used to be a separate helper - inlined here.
   */
  const synthesizeParent = (
    level: number,
    groupId: string,
    ancestorIds: string[],
  ): TRow => {
    const id = parentIdForPath([...ancestorIds, groupId]);

    const fields: Record<string, unknown> = {};
    for (const [i, field] of groupByFields.entries()) {
      fields[field] = i === level ? groupId : null;
    }

    return {
      id,
      ...fields,
      [pathField]: [...ancestorIds, id],
      [childrenField]: [] as string[],
    } as unknown as TRow;
  };

  return (allContexts, rows, maxRows, _includeParent) => {
    type Tuple = ReturnType<worker.RowsMapper<TRow>>[number];

    const tuplesWithoutParent = prevRowsMapper(
      allContexts,
      rows,
      Number.POSITIVE_INFINITY,
      false,
    );
    const rowsToGroup = tuplesWithoutParent.flat();

    console.log('!!! rowsToGroup', rowsToGroup);

    // ------------------------------------------------------------------
    // PASS 1 - build the grouping tree.
    // ------------------------------------------------------------------
    const root = createNode(null);

    for (const row of rowsToGroup) {
      let node = root;
      const ancestorIds: string[] = [];

      // Walk each grouping level, creating the group node if missing.
      for (const [level, field] of groupByFields.entries()) {
        const groupId = stringifyValue(
          (row as Record<string, unknown>)[field],
        );

        let child = node.children.get(groupId);
        if (!child) {
          const groupRow = synthesizeParent(level, groupId, ancestorIds);
          child = createNode(groupRow);
          node.children.set(groupId, child);
          node.order.push(groupId);

          // Link this group into its parent group's children list.
          if (node.groupRow) {
            childrenOf(node.groupRow).push(groupRow.id);
          }
        }

        ancestorIds.push(child.groupRow!.id);
        node = child;
      }

      // The row belongs to the deepest node; link it into that group too.
      node.rows.push(row);
      if (node.groupRow) {
        childrenOf(node.groupRow).push(row.id);
      }
      (row as Record<string, unknown>)[pathField] = [...ancestorIds, row.id];
    }

    // ------------------------------------------------------------------
    // PASS 2 - emit the tree depth-first, respecting maxRows.
    // ------------------------------------------------------------------
    const tuples: Tuple[] = [];
    let rowsCount = 0;

    /** Emit a node's group row, its children, then its leaf rows. */
    const walk = (node: TreeNode): boolean => {
      // Emit this node's own group row (root has none).
      if (node.groupRow) {
        if (rowsCount + 1 > maxRows) {
          return false;
        }
        rowsCount += 1;
        tuples.push([node.groupRow] as Tuple);
      }

      // Recurse into child groups.
      for (const childGroupId of node.order) {
        if (!walk(node.children.get(childGroupId)!)) {
          return false;
        }
      }

      // Emit leaf data rows directly under this node.
      if (node.rows.length > 0) {
        if (rowsCount + node.rows.length > maxRows) {
          return false;
        }
        rowsCount += node.rows.length;
        tuples.push([...node.rows] as Tuple);
      }

      return true;
    };

    walk(root);
    return tuples;
  };
};