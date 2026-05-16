
type ExtendAdapterOptions = {
  groupByFields?: string[];
};

/** Separator used to turn a path array into a single string key. */
export const DIVIDER = '--';

export const extendAdapter = <TRow extends data.UnknownRow>(
  prevAdapter: worker.Adapter<TRow>,
  options?: ExtendAdapterOptions,
): worker.Adapter<TRow> => {
  const groupByFields = options?.groupByFields ?? [];

  // No grouping configured -> nothing to do, just pass through.
  if (groupByFields.length === 0) {
    return prevAdapter;
  }

  // ----------------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------------
  // The ONE map. Key = path string ("Europe--Poland"), value = the group row.
  // A "group row" is a synthetic parent row we invent so AG Grid can show a tree.
  const groups = new Map<string, TRow>();

  // Tiny bookkeeping index: which leaf group does each real data row live in?
  // We need this because when a row is removed we only get its id, not its
  // field values, so we cannot recompute its path. This is the ONLY reason
  // this map exists - treat it as a single sticky note, not a subsystem.
  const rowGroup = new Map<string, string>();

  // ----------------------------------------------------------------------
  // PATH HELPERS - turning a data row into "where it belongs in the tree"
  // ----------------------------------------------------------------------

  /** ["Europe", "Poland"] -> "Europe--Poland" */
  const toKey = (path: string[]): string => path.join(DIVIDER);

  /** A data row's group path is just its grouping field values, in order. */
  const groupPathOf = (row: TRow): string[] =>
    groupByFields.map((field) =>
      stringifyValue((row as Record<string, unknown>)[field]),
    );

  // ----------------------------------------------------------------------
  // GROUP HELPERS
  // ----------------------------------------------------------------------

  /**
   * Make sure a group row exists for `key`, creating it (and giving it the
   * right field values) if missing. Returns the group row.
   */
  const ensureGroup = (path: string[], level: number): TRow => {
    const key = toKey(path.slice(0, level + 1));
    const existing = groups.get(key);
    if (existing) {
      return existing;
    }

    console.log('!!! creating group node:', key);

    // The group's own grouping fields: filled up to `level`, null below.
    const fields: Record<string, unknown> = {};
    groupByFields.forEach((field, i) => {
      fields[field] = i <= level ? path[i] : null;
    });

    const group = {
      id: uid(),
      ...fields,
      [pathField]: path.slice(0, level + 1),
      [childrenField]: [] as string[],
    } as unknown as TRow;

    groups.set(key, group);
    return group;
  };

  /**
   * Walk a row's full path from the top, creating every missing group on the
   * way, and link parent -> child at each level. Returns the leaf group key.
   */
  const ensureChainForRow = (path: string[]): string => {
    let parentKey: string | null = null;

    for (let level = 0; level < path.length; level++) {
      const group = ensureGroup(path, level);
      const key = toKey(path.slice(0, level + 1));

      // Link this group as a child of the group one level up.
      if (parentKey !== null) {
        const parent = groups.get(parentKey)!;
        const siblings = (parent as Record<string, unknown>)[
          childrenField
        ] as string[];
        if (!siblings.includes(group.id)) {
          siblings.push(group.id);
          console.log('!!! linked group', key, 'under parent', parentKey);
        }
      }
      parentKey = key;
    }

    return parentKey!; // last key visited = the leaf
  };

  /** Add a real data row into the tree. */
  const addRowToGroups = (row: TRow): void => {
    const path = groupPathOf(row);
    const leafKey = ensureChainForRow(path);

    const leaf = groups.get(leafKey)!;
    const leafChildren = (leaf as Record<string, unknown>)[
      childrenField
    ] as string[];
    if (!leafChildren.includes(row.id)) {
      leafChildren.push(row.id);
    }

    // Tell the row which leaf it sits under (AG Grid tree path).
    (row as Record<string, unknown>)[pathField] = [...path, row.id];

    rowGroup.set(row.id, leafKey);
    console.log('!!! added row', row.id, 'to group', leafKey);
  };

  /**
   * Remove a real data row from the tree, then delete any group that became
   * empty as a result, walking upward.
   */
  const removeRowFromGroups = (rowId: string): void => {
    const leafKey = rowGroup.get(rowId);
    if (!leafKey) {
      console.log('!!! remove: row', rowId, 'had no known group, skipping');
      return;
    }
    rowGroup.delete(rowId);

    // Detach the row from its leaf group.
    const leaf = groups.get(leafKey);
    if (leaf) {
      const children = (leaf as Record<string, unknown>)[
        childrenField
      ] as string[];
      (leaf as Record<string, unknown>)[childrenField] = children.filter(
        (id) => id !== rowId,
      );
    }
    console.log('!!! removed row', rowId, 'from group', leafKey);

    // Walk up the chain: delete groups that no longer have any children.
    let segments = leafKey.split(DIVIDER);
    while (segments.length > 0) {
      const key = toKey(segments);
      const group = groups.get(key);

      if (group) {
        const children = (group as Record<string, unknown>)[
          childrenField
        ] as string[];

        // Group still used by something -> stop, everything above is fine.
        if (children.length > 0) {
          break;
        }

        groups.delete(key);
        console.log('!!! deleted empty group', key);

        // Unlink it from its parent's children list.
        const parentSegments = segments.slice(0, -1);
        if (parentSegments.length > 0) {
          const parent = groups.get(toKey(parentSegments));
          if (parent) {
            const siblings = (parent as Record<string, unknown>)[
              childrenField
            ] as string[];
            (parent as Record<string, unknown>)[childrenField] =
              siblings.filter((id) => id !== group.id);
          }
        }
      }

      segments = segments.slice(0, -1); // step up one level
    }
  };

  // ----------------------------------------------------------------------
  // ROW PROCESSORS - what AG Grid hands us on add / update / remove
  // ----------------------------------------------------------------------

  const processAddRow = (row: TRow): TRow => {
    console.log('!!! processAddRow', row.id);
    addRowToGroups(row);
    return row;
  };

  const processUpdateRow = (
    row: worker.UpdatedRow<TRow>,
  ): worker.UpdatedRow<TRow> => {
    // Grouping fields are stable once a row is added, so an update can never
    // move a row to a different group. The row's path field is already
    // correct from when it was added - nothing to do here.
    console.log('!!! processUpdateRow', row.id, '(no group change)');
    return row;
  };

  const processRemoveRow = (
    row: worker.RemovedRow<TRow>,
  ): worker.RemovedRow<TRow> => {
    console.log('!!! processRemoveRow', row.id);
    removeRowFromGroups(row.id);
    return row;
  };

  // ----------------------------------------------------------------------
  // ADAPTER INTERFACE
  // ----------------------------------------------------------------------

  /** Find the group a child row belongs to (used by getParent / getParentId). */
  const getParentByChild = (child: TRow): TRow | undefined => {
    const leafKey = rowGroup.get(child.id);
    return leafKey ? groups.get(leafKey) : undefined;
  };

  return {
    ...prevAdapter,

    clear() {
      console.log('!!! clear: dropping all groups');
      prevAdapter.clear();
      groups.clear();
      rowGroup.clear();
    },

    // @ts-expect-error - matching prevAdapter's loose signature
    getParentId(child: TRow): string | undefined {
      return getParentByChild(child)?.id;
    },

    getParent(child: TRow): TRow | undefined {
      return getParentByChild(child);
    },

    // @ts-expect-error - matching prevAdapter's loose signature
    getChildrenIds(parent: TRow): string[] {
      const children = ((parent as Record<string, unknown>)[childrenField] ??
        []) as string[];
      return children.length > 0 ? children : [parent.id];
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