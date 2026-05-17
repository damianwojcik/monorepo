
type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

/**
 * One node of the grouping tree we build to emit rows in depth-first order.
 * The tree is derived entirely from each row's `pathField` (stamped by the
 * adapter) - this mapper does NOT synthesize parents or recompute paths.
 *   - `groupRow` : the synthetic parent row emitted for this node (null at root).
 *   - `children` : child nodes, keyed by their group id.
 *   - `order`    : child group ids in first-seen order (stable output).
 *   - `rows`     : real leaf data rows that belong directly to this node.
 */
type TreeNode<TRow> = {
  groupRow: TRow | null;
  children: Map<string, TreeNode<TRow>>;
  order: string[];
  rows: TRow[];
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

  const createNode = (groupRow: TRow | null): TreeNode<TRow> => ({
    groupRow,
    children: new Map(),
    order: [],
    rows: [],
  });

  /**
   * Build the synthetic parent row for a group id, derived from a child row.
   * The group id IS the parent's id - no uid(), no path recomputation. The
   * adapter already put everything we need on the child's `pathField`.
   * Grouping-field values are copied from the child (shared by the whole
   * group); fields deeper than this group's level are nulled out.
   */
  const getGroupRow = (childRow: TRow, groupId: string): TRow => {
    const path = (childRow[pathField] as string[] | undefined) ?? [];
    const level = path.indexOf(groupId); // depth of this group

    const fields: Record<string, unknown> = {};
    groupByFields.forEach((field, idx) => {
      fields[field] = idx <= level ? stringifyValue(childRow[field]) : null;
    });

    return {
      id: groupId,
      ...fields,
      [pathField]: path.slice(0, level + 1),
      [childrenField]: [] as string[],
    } as unknown as TRow;
  };

  return (allContexts, rows, maxRows, _includeParent) => {
    type Tuple = ReturnType<worker.RowsMapper<TRow>>[number];

    // Flatten whatever the previous mapper produced into a plain row list.
    const tuplesWithoutParent = prevRowsMapper(
      allContexts,
      rows,
      Number.POSITIVE_INFINITY,
      false,
    );
    const rowsToGroup = tuplesWithoutParent.flat();

    // ------------------------------------------------------------------
    // PASS 1 - build the tree from each row's path.
    // ------------------------------------------------------------------
    // A row's path looks like ['__grp__A', '__grp__A--B', '<rowId>']:
    // every segment except the last is a group id; the last is the row.
    // The adapter already stamped this onto the row - we just read it.
    const root = createNode(null);

    for (const row of rowsToGroup) {
      const path = (row[pathField] as string[] | undefined) ?? [];
      const groupIds = path.slice(0, -1); // drop the trailing leaf row id

      // Walk down the group ids, creating missing nodes as we go.
      let node = root;
      for (const groupId of groupIds) {
        let child = node.children.get(groupId);
        if (!child) {
          child = createNode(getGroupRow(row, groupId));
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

    /** Emit one node's children + rows. Returns false once maxRows is hit. */
    const emit = (node: TreeNode<TRow>): boolean => {
      for (const groupId of node.order) {
        const child = node.children.get(groupId)!;

        // Emit this child's group row...
        if (child.groupRow) {
          if (rowsCount + 1 > maxRows) {
            return false;
          }
          rowsCount += 1;
          tuples.push([child.groupRow] as Tuple);
        }

        // ...then everything beneath it.
        if (!emit(child)) {
          return false;
        }
      }

      // Leaf data rows directly under this node.
      if (node.rows.length > 0) {
        if (rowsCount + node.rows.length > maxRows) {
          return false;
        }
        rowsCount += node.rows.length;
        tuples.push([...node.rows] as Tuple);
      }

      return true;
    };

    emit(root);
    return tuples;
  };
};