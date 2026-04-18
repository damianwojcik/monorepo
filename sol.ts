import moment from 'moment';
import { backendDateFormat } from '../common/dates';
import { PropellantField } from './field';
import type { BackendRow } from './fieldSchema';

const PATH_FIELD = PropellantField.__Path;
const GROUP_BY_FIELD = PropellantField.TradingDateAndTime;
const GROUP_BY_FIELD_FORMATTED = PropellantField.__TradingDateAndTimeLocalFormatted;
const GROUP_BY_FIELD_COMPARABLE = PropellantField.__TradingDateAndTimeComparable;
const CHILDREN_FIELD = PropellantField.__Children;
const GROUP_DISPLAY_FORMAT = 'DD-MMM-YYYY';
const UNKNOWN_GROUP_KEY = 'unknown';
const UNKNOWN_GROUP_DISPLAY = 'Unknown Date';

export const getGroupId = (tradingDateAndTime: string | null | undefined) => {
  if (!tradingDateAndTime) {
    return UNKNOWN_GROUP_KEY;
  }
  const date = moment.utc(tradingDateAndTime, backendDateFormat, true);
  return date.isValid() ? date.format(GROUP_DISPLAY_FORMAT) : UNKNOWN_GROUP_KEY;
};

type GroupParent = BackendRow & { [CHILDREN_FIELD]: Set<string> };

export const adapterCreator: worker.AdapterCreator<BackendRow> = (_context: data.RowsStoreContext) => {
  const parents = new Map<string, GroupParent>();

  const logMaps = (label: string) => {
    console.log(`!!! MAPS [${label}]`, { parents });
  };

  const getOrCreateGroupParent = (groupId: string): GroupParent => {
    let parent = parents.get(groupId);
    if (!parent) {
      const date = groupId === UNKNOWN_GROUP_KEY ? null : `${groupId}T00:00:00Z`;
      const displayDate = groupId === UNKNOWN_GROUP_KEY ? UNKNOWN_GROUP_DISPLAY : groupId;
      const comparableDate = _context.makeDateComparable(date, backendDateFormat);
      parent = {
        id: groupId,
        [GROUP_BY_FIELD_FORMATTED]: displayDate,
        [GROUP_BY_FIELD_COMPARABLE]: comparableDate,
        [PATH_FIELD]: [groupId],
        [CHILDREN_FIELD]: new Set<string>(),
      } as GroupParent;
      parents.set(groupId, parent);
      logMaps(`!!! Created parent for groupId=${groupId}`);
      console.log('!!! getOrCreateGroupParent: created new parent', { parent });
    }
    return parent;
  };

  const assignRowIdToGroupId = (rowId: string, groupId: string) => {
    getOrCreateGroupParent(groupId)[CHILDREN_FIELD].add(rowId);
  };

  const removeRowIdFromGroup = (row: BackendRow) => {
    const groupId = getGroupId(row[GROUP_BY_FIELD]);
    const parent = parents.get(groupId);
    if (!parent) return;
    parent[CHILDREN_FIELD].delete(row.id);
    if (parent[CHILDREN_FIELD].size === 0) {
      parents.delete(groupId);
    }
  };

  const processAddRow = (row: BackendRow): BackendRow => {
    const groupId = getGroupId(row[GROUP_BY_FIELD]);
    assignRowIdToGroupId(row.id, groupId);
    row[PATH_FIELD] = [groupId, row.id];
    return row;
  };

  const processUpdateRow = (row: BackendRow): BackendRow => {
    const rowId = row.id;
    const value = row[GROUP_BY_FIELD];

    if (value !== undefined) {
      const newGroupId = getGroupId(value);
      const oldGroupId = [...parents.values()]
        .find(p => p[CHILDREN_FIELD].has(rowId))?.id;
      if (oldGroupId && oldGroupId !== newGroupId) {
        removeRowIdFromGroup(row);
      }
      assignRowIdToGroupId(rowId, newGroupId);
    }

    return row;
  };

  const processRemoveRow = (row: any): any => {
    removeRowIdFromGroup(row);
    return row;
  };

  const getParentGroupId = (child: BackendRow): string =>
    [...parents.values()].find(p => p[CHILDREN_FIELD].has(child.id))?.id
    ?? getGroupId(child[GROUP_BY_FIELD]);

  return {
    clear() {
      parents.clear();
    },
    getParentId(child: BackendRow) {
      return getParentGroupId(child);
    },
    getParent(child: BackendRow) {
      return parents.get(getParentGroupId(child));
    },
    getChildrenIds(parent: BackendRow) {
      const childrenIds = parents.get(parent.id)?.[CHILDREN_FIELD];
      return childrenIds
        ? (Array.from(childrenIds) as [string, ...string[]])
        : ([parent.id] as [string, ...string[]]);
    },
    getRowDeltaMessage: (json: any) => {
      console.log('!!! ADAPTER getRowDeltaMessage (STEP 1 - called first)', {
        add: json?.add,
        update: json?.update,
        remove: json?.remove,
      });
      const result = {
        ...json,
        add: json?.add?.map(processAddRow),
        update: json?.update?.map(processUpdateRow),
        remove: json?.remove?.map(processRemoveRow),
      };
      console.log('!!! ADAPTER getRowDeltaMessage (STEP 2 - after processing)', result);
      return result;
    },
  };
};