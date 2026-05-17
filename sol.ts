
import { childrenField, stringifyValue, pathField } from './common';

type ExtendAdapterOptions = {
  groupByFields?: string[];
};

/**
 * A "group node" is a synthetic parent row we invent so AG Grid can render a
 * tree. It is a normal row plus two tree fields. Note the vocabulary:
 *   - "group"  = one of these synthetic nodes (a level in the tree).
 *   - "parent" = the relationship role: the group node directly ABOVE a child.
 * A group node IS a parent TO its children; same objects, different concepts.
 */
type GroupNode<TRow> = TRow & {
  [childrenField]: string[];
  [pathField]: string[];
};

/** A path key is the joined string form of a group path ("Europe--Poland"). */
type PathKey = string & { readonly __brand: 'PathKey' };

/** Separator used to turn a path array into a single PathKey. */
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
  // STATE - the ONE map.
  // ----------------------------------------------------------------------
  // Key = PathKey of the group. Value = the group node living at that path.
  const groups = new Map<PathKey, GroupNode<TRow>>();

  // ----------------------------------------------------------------------
  // PATH HELPERS - turning a data row into "where it belongs in the tree"
  // ----------------------------------------------------------------------

  /** ["Europe", "Poland"] -> "Europe--Poland" as a PathKey. */
  const toKey = (path: string[]): PathKey => path.join(DIVIDER) as PathKey;

  /** A data row's group path is just its grouping field values, in order. */
  const groupPathOf = (row: TRow): string[] =>
    groupByFields.map((field) => stringifyValue(row[field]));

  /** Read a group node's children id list (never undefined). */
  const childrenOf = (group: GroupNode<TRow>): string[] =>
    group[childrenField] ?? [];

  // ----------------------------------------------------------------------
  // GROUP NODE HELPERS
  // ----------------------------------------------------------------------

  /**
   * Make sure a group node exists for the path truncated to `level`, creating
   * it (with the right field values) if missing. Returns the group node.
   */
  const ensureGroup = (path: string[], level: number): GroupNode<TRow> => {
    const key = toKey(path.slice(0, level + 1));
    const existing = groups.get(key);
    if (existing) {
      return existing;
    }

    console.log('!!! creating group node:', key);

    // The group's own grouping fields: filled up to `level`, null below.
    const fields = Object.fromEntries(
      groupByFields.map((field, i) => [field, i <= level ? path[i] : null]),
    );

    const group = {
      id: uid(),
      ...fields,
      [pathField]: path.slice(0, level + 1),
      [childrenField]: [] as string[],
    } as unknown as GroupNode<TRow>;

    groups.set(key, group);
    return group;
  };

  /**
   * Walk a row's full path from the top, creating every missing group on the
   * way, and link parent -> child at each level. Returns the leaf group's key.
   */
  const ensureChainForRow = (path: string[]): PathKey => {
    let parentKey: PathKey | null = null;

    for (const [level] of path.entries()) {
      const group = ensureGroup(path, level);
      const key = toKey(path.slice(0, level + 1));

      // Link this group as a child of the group one level up (its parent).
      if (parentKey !== null) {
        const parent = groups.get(parentKey)!;
        const siblings = childrenOf(parent);
        if (!siblings.includes(group.id)) {
          siblings.push(group.id);
          console.log('!!! linked group', key, 'under parent', parentKey);
        }
      }
      parentKey = key;
    }

    return parentKey!; // last key visited = the leaf
  };

  /**
   * Find the group node that currently holds a data row, by scanning the
   * groups map for the one whose children include `rowId`. Simple and
   * uniform - same approach as the single-level reference adapter.
   */
  const findGroupOfRow = (rowId: string): GroupNode<TRow> | undefined => {
    for (const group of groups.values()) {
      if (childrenOf(group).includes(rowId)) {
        return group;
      }
    }
    return undefined;
  };

  /** Add a real data row into the tree, building its parent chain. */
  const addRowToGroups = (row: TRow): void => {
    const path = groupPathOf(row);
    const leafKey = ensureChainForRow(path);

    const leaf = groups.get(leafKey)!;
    const leafChildren = childrenOf(leaf);
    if (!leafChildren.includes(row.id)) {
      leafChildren.push(row.id);
    }

    // Tell the row its AG Grid tree path.
    (row as GroupNode<TRow>)[pathField] = [...path, row.id];

    console.log('!!! added row', row.id, 'to group', leafKey);
  };

  /**
   * Detach a row id from one group node, then delete that group (and its
   * ancestors) if they became empty. `group` is the row's direct parent.
   */
  const detachAndPrune = (rowId: string, group: GroupNode<TRow>): void => {
    group[childrenField] = childrenOf(group).filter((id) => id !== rowId);
    console.log('!!! detached', rowId, 'from group', toKey(group[pathField]));

    // Walk up the chain (leaf -> root): drop groups that have no children.
    const segments = group[pathField];
    const levelsTopDown = [...segments.keys()];

    for (const level of levelsTopDown.reverse()) {
      const key = toKey(segments.slice(0, level + 1));
      const node = groups.get(key);
      if (!node) {
        continue;
      }

      // Still used -> stop, everything above it is fine too.
      if (childrenOf(node).length > 0) {
        break;
      }

      groups.delete(key);
      console.log('!!! deleted empty group', key);

      // Unlink it from its parent's children list.
      const parentSegments = segments.slice(0, level);
      if (parentSegments.length > 0) {
        const parent = groups.get(toKey(parentSegments));
        if (parent) {
          parent[childrenField] = childrenOf(parent).filter(
            (id) => id !== node.id,
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
   * Update: the row may have moved to a different group (photo-2 semantics).
   * Find where it WAS, compare to where it should BE, relocate if different.
   */
  const processUpdateRow = (
    row: worker.UpdatedRow<TRow>,
  ): worker.UpdatedRow<TRow> => {
    const updatedRow = row as unknown as TRow;
    const newLeafKey = toKey(groupPathOf(updatedRow));
    const oldGroup = findGroupOfRow(updatedRow.id);
    const oldLeafKey = oldGroup ? toKey(oldGroup[pathField]) : undefined;

    if (oldLeafKey === newLeafKey) {
      // Same group: only the tree path field needs refreshing.
      console.log('!!! processUpdateRow', updatedRow.id, '(same group)');
      (updatedRow as GroupNode<TRow>)[pathField] = [
        ...groupPathOf(updatedRow),
        updatedRow.id,
      ];
      return row;
    }

    console.log(
      '!!! processUpdateRow',
      updatedRow.id,
      'moved:',
      oldLeafKey,
      '->',
      newLeafKey,
    );
    if (oldGroup) {
      detachAndPrune(updatedRow.id, oldGroup);
    }
    addRowToGroups(updatedRow);
    return row;
  };

  const processRemoveRow = (
    row: worker.RemovedRow<TRow>,
  ): worker.RemovedRow<TRow> => {
    console.log('!!! processRemoveRow', row.id);
    const group = findGroupOfRow(row.id);
    if (group) {
      detachAndPrune(row.id, group);
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

    /** A group node's parent id, or a data row's parent group id. */
    getParentId(child: TRow): string | undefined {
      // If `child` is itself a group node, its parent is one level up.
      const childPath = (child as Partial<GroupNode<TRow>>)[pathField];
      if (childPath && childPath.length > 1) {
        return groups.get(toKey(childPath.slice(0, -1)))?.id;
      }
      // Otherwise `child` is a real data row: find the group holding it.
      return findGroupOfRow(child.id)?.id;
    },

    getChildrenIds(parent: TRow): string[] {
      // A group node exposes its children list directly.
      const group = parent as Partial<GroupNode<TRow>>;
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