

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
      children: Map<string, TreeNode>;
      rows: TRow[];
      order: string[];
    };

    const root: TreeNode = {
      groupId: '__root__',
      level: -1,
      children: new Map(),
      rows: [],
      order: [],
    };

    for (const row of rowsToGroup) {
      let node = root;
      for (let level = 0; level < groupByFields.length; level++) {
        const groupId = getGroupId(
          (row as Record<string, any>)[groupByFields[level]!],
        );
        let child = node.children.get(groupId);
        if (!child) {
          child = {
            groupId,
            level,
            children: new Map(),
            rows: [],
            order: [],
          };
          node.children.set(groupId, child);
          node.order.push(groupId);
        }
        node = child;
      }
      node.rows.push(row);
    }

    const findParentForPath = (path: string[]): TRow | undefined => {
      for (const context of allContexts) {
        for (const [, parentRow] of context.matchedParents) {
          let matches = true;
          for (let level = 0; level < path.length; level++) {
            if (
              getGroupId(
                (parentRow as Record<string, any>)[groupByFields[level]!],
              ) !== path[level]
            ) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return parentRow as TRow;
          }
        }
      }
      return undefined;
    };

    const tuples: Tuple[] = [];
    let rowsCount = 0;

    const walk = (
      node: TreeNode,
      pathSoFar: string[],
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
        tuple.push(...node.rows);

        if (tuple.length === 0) {
          return true;
        }
        if (rowsCount + tuple.length > maxRows) {
          return false;
        }
        rowsCount += tuple.length;
        tuples.push(tuple as Tuple);
        return true;
      }

      for (const childGroupId of node.order) {
        const child = node.children.get(childGroupId)!;
        const childPath = [...pathSoFar, child.groupId];
        let nextParents = parentsSoFar;
        if (includeParent) {
          const parentRow = findParentForPath(childPath);
          if (parentRow) {
            nextParents = [...parentsSoFar, parentRow];
          }
        }
        const cont = walk(child, childPath, nextParents);
        if (!cont) {
          return false;
        }
      }
      return true;
    };

    for (const topGroupId of root.order) {
      const topNode = root.children.get(topGroupId)!;
      const cont = walk(topNode, [topGroupId], []);
      if (!cont) {
        break;
      }
    }

    return tuples;
  };
};