
type ExtendAdapterOptions = {
  groupByFields?: string[];
};

/**
 * A "group row" is a synthetic parent row we invent so AG Grid can render a
 * tree. It is a normal row plus two tree fields. Vocabulary matters here:
 *   - "group"  = one of these synthetic rows (a level/node in the tree).
 *   - "parent" = the relationship role: the group row directly ABOVE a child.
 * A group row IS a parent TO its children - same objects, different concepts.
 */
type GroupRow<TRow> = TRow & {
  [childrenField]: string[];
  [pathField]: string[];
};

/** Separator used to turn a group path array into a single id string. */
export const DIVIDER = '--';

/** ["Europe", "Poland"] -> "Europe--Poland". The id OF a group row. */
const getIdFromPath = (path: string[]): string => path.join(DIVIDER);

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
  // STATE - the ONE map.
  // ----------------------------------------------------------------------
  // Key = the group's id (its joined path). Value = the group row itself.
  const groups = new Map<string, GroupRow<TRow>>();

  // ----------------------------------------------------------------------
  // SMALL HELPERS
  // ----------------------------------------------------------------------

  /** A data row's group path = its grouping field values, in order. */
  const getGroupPath = (row: TRow): string[] =>
    groupByFields.map((field) => stringifyValue(row[field]));

  /** Read a group row's children id list (never undefined). */
  const childrenOf = (group: GroupRow<TRow>): string[] =>
    group[childrenField] ?? [];

  // ----------------------------------------------------------------------
  // GROUP ROW HELPERS
  // ----------------------------------------------------------------------

  /**
   * Make sure a group row exists for the path truncated to `level`, creating
   * it (with the right field values) if missing. Returns the group row.
   */
  const getOrCreateGroupRow = (
    groupPath: string[],
    level: number,
  ): GroupRow<TRow> => {
    const id = getIdFromPath(groupPath.slice(0, level));
    const existing = groups.get(id);
    if (existing) {
      return existing;
    }

    console.log('!!! creating group row:', id);

    // The group's own grouping fields: filled up to `level`, null below.
    const fields = Object.fromEntries(
      groupByFields.map((field, idx) => [
        field,
        idx < level ? groupPath[idx] : null,
      ]),
    );

    const groupRow = {
      id,
      ...fields,
      [pathField]: groupPath.slice(0, level),
      [childrenField]: [] as string[],
    } as unknown as GroupRow<TRow>;

    groups.set(id, groupRow);
    return groupRow;
  };

  /**
   * Walk a row's full path from the top, creating every missing group on the
   * way, and link parent -> child at each level. Returns the leaf group's id.
   */
  const ensureChainForRow = (groupPath: string[]): string => {
    let parentId: string | null = null;

    for (const [level] of groupPath.entries()) {
      const groupRow = getOrCreateGroupRow(groupPath, level + 1);
      const groupId = getIdFromPath(groupPath.slice(0, level + 1));

      // Link this group as a child of the group one level up (its parent).
      if (parentId !== null) {
        const parent = groups.get(parentId)!;
        const children = childrenOf(parent);
        if (!children.includes(groupRow.id)) {
          children.push(groupRow.id);
          console.log('!!! linked group', groupId, 'under parent', parentId);
        }
      }
      parentId = groupId;
    }

    return parentId!; // last id visited = the leaf
  };

  /**
   * Find the group row that currently holds a data row, by scanning the
   * groups map for the one whose children include `rowId`. Simple and
   * uniform - same approach as the single-level reference adapter.
   */
  const findGroupOfRow = (rowId: string): GroupRow<TRow> | undefined => {
    for (const groupRow of groups.values()) {
      if (childrenOf(groupRow).includes(rowId)) {
        return groupRow;
      }
    }
    return undefined;
  };

  /** Add a real data row into the tree, building its parent chain. */
  const addRowToGroups = (row: TRow): void => {
    const groupPath = getGroupPath(row);
    const leafId = ensureChainForRow(groupPath);

    const leaf = groups.get(leafId)!;
    const leafChildren = childrenOf(leaf);
    if (!leafChildren.includes(row.id)) {
      leafChildren.push(row.id);
    }

    // Tell the row its AG Grid tree path.
    (row as GroupRow<TRow>)[pathField] = [...groupPath, row.id];

    console.log('!!! added row', row.id, 'to group', leafId);
  };

  /**
   * Detach a row id from its parent group, then delete that parent (and its
   * ancestors) if they became empty. `parent` is the row's direct parent.
   */
  const removeRowFromGroups = (
    rowId: string,
    parent: GroupRow<TRow>,
  ): void => {
    parent[childrenField] = childrenOf(parent).filter((id) => id !== rowId);
    console.log('!!! removed row', rowId, 'from group', parent.id);

    // Walk up the chain (leaf -> root): drop groups that have no children.
    const segments = parent[pathField];
    const levelsTopDown = [...segments.keys()];

    for (const level of levelsTopDown.reverse()) {
      const groupId = getIdFromPath(segments.slice(0, level + 1));
      const groupRow = groups.get(groupId);
      if (!groupRow) {
        continue;
      }

      // Still used -> stop, everything above it is fine too.
      if (childrenOf(groupRow).length > 0) {
        break;
      }

      groups.delete(groupId);
      console.log('!!! deleted empty group', groupId);

      // Unlink it from its parent's children list.
      const parentSegments = segments.slice(0, level);
      if (parentSegments.length > 0) {
        const parent = groups.get(getIdFromPath(parentSegments));
        if (parent) {
          parent[childrenField] = childrenOf(parent).filter(
            (id) => id !== groupRow.id,
          );
        }
      }
    }
  };

  // ----------------------------------------------------------------------
  // ROW PROCESSORS - what prevAdapter hands us on add / update / remove
  // ----------------------------------------------------------------------

  const processAddRow = (row: TRow): TRow => {
    console.log('!!! processAddRow', row.id);
    addRowToGroups(row);
    return row;
  };

  /**
   * Update: a row may have moved to a different group. Find where it WAS,
   * compare to where it should BE now, relocate it if the group changed.
   */
  const processUpdateRow = (
    row: worker.UpdatedRow<TRow>,
  ): worker.UpdatedRow<TRow> => {
    const updatedRow = row as unknown as TRow;
    const newLeafId = getIdFromPath(getGroupPath(updatedRow));
    const oldGroup = findGroupOfRow(updatedRow.id);

    if (oldGroup?.id === newLeafId) {
      // Same group: just refresh the tree path field.
      console.log('!!! processUpdateRow', updatedRow.id, '(same group)');
      (updatedRow as GroupRow<TRow>)[pathField] = [
        ...getGroupPath(updatedRow),
        updatedRow.id,
      ];
      return row;
    }

    console.log(
      '!!! processUpdateRow',
      updatedRow.id,
      'moved:',
      oldGroup?.id,
      '->',
      newLeafId,
    );
    if (oldGroup) {
      removeRowFromGroups(updatedRow.id, oldGroup);
    }
    addRowToGroups(updatedRow);
    return row;
  };

  const processRemoveRow = (
    row: worker.RemovedRow<TRow>,
  ): worker.RemovedRow<TRow> => {
    console.log('!!! processRemoveRow', row.id);
    const parent = findGroupOfRow(row.id);
    if (parent) {
      removeRowFromGroups(row.id, parent);
    } else {
      console.log('!!! processRemoveRow: no group found for', row.id);
    }
    return row;
  };

  // ----------------------------------------------------------------------
  // ADAPTER INTERFACE
  // ----------------------------------------------------------------------

  return {
    ...prevAdapter,

    clear() {
      console.log('!!! clear: dropping all groups');
      prevAdapter.clear();
      groups.clear();
    },

    /** The parent group of a child - works for both group rows and data rows. */
    getParentId(child: TRow): string | undefined {
      // If `child` is itself a group row, its parent is one level up.
      const childPath = (child as Partial<GroupRow<TRow>>)[pathField];
      if (childPath && childPath.length > 1) {
        return groups.get(getIdFromPath(childPath.slice(0, -1)))?.id;
      }
      // Otherwise `child` is a real data row: find the group holding it.
      return findGroupOfRow(child.id)?.id;
    },

    getParent(child: TRow): TRow | undefined {
      const parentId = this.getParentId(child);
      return parentId ? groups.get(parentId) : undefined;
    },

    getChildrenIds(node: TRow): string[] {
      // A group row exposes its children list directly.
      const group = node as Partial<GroupRow<TRow>>;
      if (group[childrenField]) {
        return group[childrenField];
      }
      // A leaf data row has no children.
      return [];
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