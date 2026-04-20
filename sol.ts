import moment from 'moment';
import { data, worker } from '@ubs.fi.axion-framework/common';
import { backendDateFormat } from '../common/dates';
import { Field } from './field';
import type { BackendRow } from './fieldSchema';
import { fields } from './fields';
import { buildAggConfig, computeAggregatedValues } from './adapter-aggregation';

export const GROUP_BY_FIELD = Field.DATE;
const PATH_FIELD = Field.__Path;
const CHILDREN_FIELD = Field.__Children;
const GROUP_BY_FIELD_FORMATTED = Field.__DATE_FORMATTED;
const GROUP_BY_FIELD_COMPARABLE = Field.__DATE_COMPARABLE;
const GROUP_DISPLAY_FORMAT = 'DD-MMM-YYYY';
const UNKNOWN_GROUP_KEY = 'unknown';
const UNKNOWN_GROUP_DISPLAY = 'Unknown Date';

export const getGroupId = (dateString: string | null | undefined) => {
  if (!dateString) {
    return UNKNOWN_GROUP_KEY;
  }

  const date = moment.utc(dateString, backendDateFormat, true);
  const result = date.isValid() ? date.format(GROUP_DISPLAY_FORMAT) : UNKNOWN_GROUP_KEY;
  return result;
};

export const adapterCreator: worker.AdapterCreator<BackendRow> = (context: data.RowsStoreContext) => {
  const groups = new Map<string, BackendRow>();
  const childRows = new Map<string, BackendRow>();
  const aggConfig = buildAggConfig(fields);
  console.log('!!! aggConfig built:', { aggConfig });

  const getOrCreateGroupParent = (groupId: string): BackendRow => {
    let parent = groups.get(groupId);
    if (!parent) {
      const date = groupId === UNKNOWN_GROUP_KEY ? null : groupId;
      const displayDate = groupId === UNKNOWN_GROUP_KEY ? UNKNOWN_GROUP_DISPLAY : groupId;
      const comparableDate = data.makeDateComparable(date, GROUP_DISPLAY_FORMAT);
      console.log('!!! date', { date, displayDate, comparableDate });
      parent = {
        id: groupId,
        [GROUP_BY_FIELD_FORMATTED]: displayDate,
        [GROUP_BY_FIELD_COMPARABLE]: comparableDate,
        [PATH_FIELD]: [groupId],
        [CHILDREN_FIELD]: [] as string[],
      } as BackendRow;
      groups.set(groupId, parent);
    }
    return parent;
  };

  const removeRowIdFromGroup = (row: BackendRow) => {
    const groupId = getGroupId(row[GROUP_BY_FIELD]);
    const parent = groups.get(groupId);
    if (!parent) return;

    const children = parent[CHILDREN_FIELD]!.filter(id => id !== row.id);
    if (children.length === 0) {
      groups.delete(groupId);
    } else {
      parent[CHILDREN_FIELD] = children;
    }
  };

  const assignRowIdToGroupId = (rowId: string, groupId: string) => {
    const parent = getOrCreateGroupParent(groupId);
    const children = parent[CHILDREN_FIELD]!;
    if (!children.includes(rowId)) {
      children.push(rowId);
    }
  };

  const getParentGroupId = (child: BackendRow): string | undefined =>
    [...groups.values()].find(parent => parent[CHILDREN_FIELD]?.includes(child.id))?.id;

  const recalculateParent = (groupId: string) => {
    const parent = groups.get(groupId);
    if (!parent) return;

    const childIds = parent[CHILDREN_FIELD]!;
    const children = childIds
      .map((id) => childRows.get(id))
      .filter((r): r is BackendRow => r !== undefined);

    console.log('!!! recalculateParent - groupId:', groupId, 'children count:', children.length);

    if (children.length > 0) {
      const aggValues = computeAggregatedValues(children, aggConfig);
      console.log('!!! aggValues:', aggValues);
      Object.assign(parent, aggValues);
      console.log('!!! parent after aggregation:', parent);
    }
  };

  const processAddRow = (row: BackendRow): BackendRow => {
    const groupId = getGroupId(row[GROUP_BY_FIELD]);
    assignRowIdToGroupId(row.id, groupId);
    row[PATH_FIELD] = [groupId, row.id];
    childRows.set(row.id, row);

    console.log('!!! processAddRow - row:', row.id, 'groupId:', groupId);
    recalculateParent(groupId);

    return row;
  };

  const processUpdateRow = (row: BackendRow): BackendRow => {
    const rowId = row.id;
    const value = row[GROUP_BY_FIELD];

    if (value !== undefined) {
      const newGroupId = getGroupId(value);
      const oldGroupId = [...groups.values()].find(parent => parent[CHILDREN_FIELD]?.includes(rowId))?.id;
      if (oldGroupId && oldGroupId !== newGroupId) {
        removeRowIdFromGroup(row);
        childRows.delete(rowId);
        console.log('!!! processUpdateRow - row moved groups, old:', oldGroupId, 'new:', newGroupId);
        recalculateParent(oldGroupId);
      }
      assignRowIdToGroupId(rowId, newGroupId);
    }

    childRows.set(rowId, row);

    const parentGroupId = getParentGroupId(row);
    if (parentGroupId) {
      console.log('!!! processUpdateRow - row:', rowId, 'parentGroupId:', parentGroupId);
      recalculateParent(parentGroupId);
    }

    return row;
  };

  const processRemoveRow = (row: BackendRow): BackendRow => {
    const parentGroupId = getParentGroupId(row);
    removeRowIdFromGroup(row);
    childRows.delete(row.id);

    if (parentGroupId) {
      console.log('!!! processRemoveRow - row:', row.id, 'parentGroupId:', parentGroupId);
      recalculateParent(parentGroupId);
    }

    return row;
  };

  return {
    clear() {
      groups.clear();
      childRows.clear();
    },
    getParentId(child: BackendRow) {
      return getParentGroupId(child);
    },
    getParent(child: BackendRow) {
      return groups.get(getParentGroupId(child)!);
    },
    getChildrenIds(parent: BackendRow) {
      const childrenIds = groups.get(parent.id)?.[CHILDREN_FIELD];
      return childrenIds && childrenIds.length > 0
        ? (childrenIds as [string, ...string[]])
        : ([parent.id] as [string, ...string[]]);
    },
    getRowDeltaMessage: (json: any) => {
      const result = {
        ...json,
        add: json?.add?.map(processAddRow),
        update: json?.update?.map(processUpdateRow),
        remove: json?.remove?.map(processRemoveRow),
      };
      return result;
    },
  };
};