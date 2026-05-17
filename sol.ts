import { DIVIDER, childrenField, stringifyValue, pathField } from './common';

type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

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
   * One node of the grouping tree.
   *   - `groupRow` : the parent row for this node (null at root).
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

  /** A group id is its grouping-field values up to `level`, joined by DIVIDER. */
  const groupIdAt = (row: TRow, level: number): string =>
    groupByFields
      .slice(0, level + 1)
      .map((field) => stringifyValue((row as Record<string, unknown>)[field]))
      .join(DIVIDER);

  return (allContexts, rows, maxRows, _includeParent) => {
    type Tuple = ReturnType<worker.RowsMapper<TRow>>[number];

    const tuplesWithoutParent = prevRowsMapper(
      allContexts,
      rows,
      Number.POSITIVE_INFINITY,
      false,
    );
    const rowsToGroup = tuplesWithoutParent.flat();

    // Collect every parent row the upstream contexts already built, keyed by
    // id. These ARE the group rows - the mapper no longer synthesizes them.
    const knownParents = new Map<string, TRow>();
    for (const context of allContexts) {
      for (const [parentId, parentRow] of context.matchedParents) {
        knownParents.set(parentId, parentRow as unknown as TRow);
      }
    }

    /**
     * The parent row for a group id. Prefer the real row from matchedParents;
     * fall back to a minimal stub only if a level is genuinely missing (keeps
     * the grid from breaking if matchedParents lacks an intermediate level).
     */
    const getGroupRow = (groupId: string): TRow => {
      const known = knownParents.get(groupId);
      if (known) {
        return known;
      }
      console.log('!!! no matchedParent for group, stubbing:', groupId);
      return {
        id: groupId,
        [pathField]: groupId.split(DIVIDER),
        [childrenField]: [] as string[],
      } as unknown as TRow;
    };

    // ------------------------------------------------------------------
    // PASS 1 - build the grouping tree from each row's grouping fields.
    // ------------------------------------------------------------------
    const root = createNode(null);

    for (const row of rowsToGroup) {
      let node = root;

      for (let level = 0; level < groupByFields.length; level++) {
        const groupId = groupIdAt(row, level);

        let child = node.children.get(groupId);
        if (!child) {
          child = createNode(getGroupRow(groupId));
          node.children.set(groupId, child);
          node.order.push(groupId);
        }
        node = child;
      }

      // The row belongs to the deepest node on its path.
      node.rows.push(row);
    }

    // ------------------------------------------------------------------
    // PASS 2 - emit the tree depth-first, respecting maxRows.
    // ------------------------------------------------------------------
    const tuples: Tuple[] = [];
    let rowsCount = 0;

    /** Emit a node's group row, then its child groups, then its leaf rows. */
    const walk = (node: TreeNode): boolean => {
      if (node.groupRow) {
        if (rowsCount + 1 > maxRows) {
          return false;
        }
        rowsCount += 1;
        tuples.push([node.groupRow] as Tuple);
      }

      for (const childGroupId of node.order) {
        if (!walk(node.children.get(childGroupId)!)) {
          return false;
        }
      }

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