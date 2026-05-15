

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

  const groupsByPath = new Map<string, TRow>();
  const rowIdToLeafPathKey = new Map<string, string>();

  const pathKeyOf = (groupPath: string[], level: number): string =>
    groupPath.slice(0, level + 1).join('|');

  const getGroupPath = (row: TRow): string[] =>
    groupByFields.map((field) =>
      getGroupId((row as Record<string, any>)[field]),
    );

  const buildParentFields = (level: number, groupId: string): Record<string, unknown> => {
    const fields: Record<string, unknown> = {};
    for (let i = 0; i < groupByFields.length; i++) {
      const field = groupByFields[i]!;
      fields[field] = i === level ? groupId : null;
    }
    return fields;
  };

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
          ...buildParentFields(level, groupPath[level]!),
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

  const removeRowIdFromLeaf = (rowId: string, leafPathKey: string): void => {
    const leaf = groupsByPath.get(leafPathKey);
    if (!leaf) {
      return;
    }
    const children = ((leaf as Record<string, any>)[childrenField] ??
      []) as string[];
    const filtered = children.filter((id) => id !== rowId);
    (leaf as Record<string, any>)[childrenField] = filtered;

    if (filtered.length === 0) {
      cleanupEmptyChain(leafPathKey);
    }
  };

  const attachRowToChain = (row: TRow): void => {
    const groupPath = getGroupPath(row);
    const parents = getOrCreateParentChain(groupPath);
    const leaf = parents[parents.length - 1]!;
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
    rowIdToLeafPathKey.set(row.id, pathKeyOf(groupPath, groupPath.length - 1));
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
      const leaf = parents[parents.length - 1]!;
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
    getParentId(child: TRow): string | undefined {
      const parent = getParentByChild(child);
      return parent ? (parent as Record<string, any>).id : undefined;
    },
    getParent(child: TRow): TRow | undefined {
      return getParentByChild(child);
    },
    getChildrenIds(parent: TRow): string[] {
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