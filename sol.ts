
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

    // Build nested tree: Map keyed by groupId at each level
    type TreeNode = {
      groupId: string;
      level: number;
      children: Map<string, TreeNode>; // for non-leaf levels
      rows: TRow[]; // populated only at leaf level
      order: string[]; // preserves insertion order of children
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
        const field = groupByFields[level];
        const groupId = getGroupId((row as any)[field]);
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

    // Find parent rows for each level by scanning context.matchedParents.
    // matchedParents contains all group parents; we match by checking each
    // groupByField value on the parent row.
    const findParentForPath = (path: string[]): TRow | undefined => {
      const targetLevel = path.length - 1;
      const targetField = groupByFields[targetLevel];
      for (const context of allContexts) {
        for (const [, parentRow] of context.matchedParents) {
          let matches = true;
          for (let level = 0; level < path.length; level++) {
            if (
              getGroupId((parentRow as any)[groupByFields[level]]) !==
              path[level]
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

    // Depth-first walk: at each leaf, emit a tuple containing the full parent
    // chain (if includeParent) followed by the leaf rows.
    const walk = (
      node: TreeNode,
      pathSoFar: string[],
      parentsSoFar: TRow[],
    ): boolean => {
      if (node.level === groupByFields.length - 1) {
        // Leaf
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
          return false; // stop the walk
        }
        rowsCount += tuple.length;
        tuples.push(tuple as Tuple);
        return true;
      }

      // Non-leaf: recurse children in insertion order
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





//////////////////////////////////////
export const getGroupId = (input: string | null | undefined): string =>
  input || 'unknown';

export const pathField = '#path';
export const childrenField = '#children';

type ExtendAdapterOptions = {
  groupByFields?: string[];
};

export const extendAdapter = <TRow extends data.UnknownRow>(
  prevAdapter: worker.Adapter<TRow>,
  options?: ExtendAdapterOptions,
): worker.Adapter<TRow> => {
  const groupByFields = options?.groupByFields ?? [];
  if (groupByFields.length === 0) {
    return prevAdapter;
  }

  // Key: groupIds joined by '|' from root to this level. Value: parent row.
  const groupsByPath = new Map<string, TRow>();
  // rowId -> leaf parent pathKey (so we can find the parent on update/remove)
  const rowIdToLeafPathKey = new Map<string, string>();

  const pathKeyOf = (groupPath: string[], level: number): string =>
    groupPath.slice(0, level + 1).join('|');

  const getGroupPath = (row: TRow): string[] =>
    groupByFields.map((field) =>
      getGroupId((row as Record<string, any>)[field]),
    );

  const getOrCreateParentChain = (groupPath: string[]): TRow[] => {
    const parents: TRow[] = [];
    const parentIds: string[] = [];

    for (let level = 0; level < groupPath.length; level++) {
      const key = pathKeyOf(groupPath, level);
      let parent = groupsByPath.get(key);

      if (!parent) {
        const id = uid();
        parent = {
          id,
          [groupByFields[level]]: groupPath[level],
          [pathField]: [...parentIds, id],
          [childrenField]: [] as string[],
        } as unknown as TRow;
        groupsByPath.set(key, parent);

        if (level > 0) {
          const parentChildren = (parents[level - 1] as Record<string, any>)[
            childrenField
          ] as string[];
          parentChildren.push(id);
        }
      }

      parents.push(parent);
      parentIds.push((parent as Record<string, any>).id);
    }

    return parents;
  };

  const removeRowIdFromLeaf = (rowId: string, leafPathKey: string): void => {
    const leaf = groupsByPath.get(leafPathKey);
    if (!leaf) {
      return;
    }
    const children = ((leaf as Record<string, any>)[childrenField] ??
      []) as string[];
    const filtered = children.filter((id) => id !== rowId);
    (leaf as Record<string, any>)[childrenField] = filtered;

    // Auto-cleanup empty parents bottom-up
    if (filtered.length === 0) {
      cleanupEmptyChain(leafPathKey);
    }
  };

  const cleanupEmptyChain = (pathKey: string): void => {
    const segments = pathKey.split('|');
    for (let level = segments.length - 1; level >= 0; level--) {
      const key = segments.slice(0, level + 1).join('|');
      const node = groupsByPath.get(key);
      if (!node) {
        continue;
      }
      const children = ((node as Record<string, any>)[childrenField] ??
        []) as string[];
      if (children.length > 0) {
        break;
      }
      // Detach from parent (if any) and delete
      if (level > 0) {
        const parentKey = segments.slice(0, level).join('|');
        const parent = groupsByPath.get(parentKey);
        if (parent) {
          const parentChildren = ((parent as Record<string, any>)[
            childrenField
          ] ?? []) as string[];
          const nodeId = (node as Record<string, any>).id;
          (parent as Record<string, any>)[childrenField] =
            parentChildren.filter((id) => id !== nodeId);
        }
      }
      groupsByPath.delete(key);
    }
  };

  const attachRowToChain = (row: TRow): TRow[] => {
    const groupPath = getGroupPath(row);
    const parents = getOrCreateParentChain(groupPath);
    const leaf = parents[parents.length - 1];
    const leafChildren = (leaf as Record<string, any>)[
      childrenField
    ] as string[];
    if (!leafChildren.includes(row.id)) {
      leafChildren.push(row.id);
    }
    (row as Record<string, any>)[pathField] = [
      ...((leaf as Record<string, any>)[pathField] as string[]),
      row.id,
    ];
    rowIdToLeafPathKey.set(
      row.id,
      pathKeyOf(
        groupPath,
        groupPath.length - 1,
      ),
    );
    return parents;
  };

  const processAddRow = (row: TRow): TRow => {
    attachRowToChain(row);
    return row;
  };

  const processUpdateRow = (
    row: worker.UpdatedRow<TRow>,
  ): worker.UpdatedRow<TRow> => {
    const rowId = row.id;
    const newGroupPath = groupByFields.map((field) =>
      getGroupId((row as Record<string, any>)[field]),
    );
    const newLeafKey = pathKeyOf(newGroupPath, newGroupPath.length - 1);
    const oldLeafKey = rowIdToLeafPathKey.get(rowId);

    if (oldLeafKey !== newLeafKey) {
      if (oldLeafKey) {
        removeRowIdFromLeaf(rowId, oldLeafKey);
      }
      const parents = getOrCreateParentChain(newGroupPath);
      const leaf = parents[parents.length - 1];
      const leafChildren = (leaf as Record<string, any>)[
        childrenField
      ] as string[];
      if (!leafChildren.includes(rowId)) {
        leafChildren.push(rowId);
      }
      (row as Record<string, any>)[pathField] = [
        ...((leaf as Record<string, any>)[pathField] as string[]),
        rowId,
      ];
      rowIdToLeafPathKey.set(rowId, newLeafKey);
    }

    return row;
  };

  const processRemoveRow = (
    row: worker.RemovedRow<TRow>,
  ): worker.RemovedRow<TRow> => {
    const leafPathKey = rowIdToLeafPathKey.get(row.id);
    if (leafPathKey) {
      removeRowIdFromLeaf(row.id, leafPathKey);
      rowIdToLeafPathKey.delete(row.id);
    }
    return row;
  };

  const getParentByChild = (child: TRow): TRow | undefined => {
    const leafKey = rowIdToLeafPathKey.get(child.id);
    if (leafKey) {
      return groupsByPath.get(leafKey);
    }
    // Fallback: compute from child's fields
    const groupPath = getGroupPath(child);
    return groupsByPath.get(pathKeyOf(groupPath, groupPath.length - 1));
  };

  return {
    ...prevAdapter,
    clear() {
      prevAdapter.clear();
      groupsByPath.clear();
      rowIdToLeafPathKey.clear();
    },
    getParentId(child: TRow) {
      const parent = getParentByChild(child);
      return parent
        ? (parent as Record<string, any>).id
        : undefined;
    },
    getParent(child: TRow) {
      return getParentByChild(child);
    },
    getChildrenIds(parent: TRow) {
      const children = ((parent as Record<string, any>)[childrenField] ??
        []) as string[];
      return children.length > 0
        ? children
        : [(parent as Record<string, any>).id];
    },
    getRowDeltaMessage(json: unknown): worker.RowDeltaMessage<TRow> {
      const rowDeltaMessage = prevAdapter.getRowDeltaMessage(json);
      return {
        ...rowDeltaMessage,
        add: rowDeltaMessage?.add?.map(processAddRow),
        update: rowDeltaMessage?.update?.map(processUpdateRow),
        remove: rowDeltaMessage?.remove?.map(processRemoveRow),
      };
    },
  };
};