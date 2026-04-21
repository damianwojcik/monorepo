const affectedGroupIds = new Set<string>();

const trackParent = (row: BackendRow) => {
  const parentId = getParentGroupId(row);
  if (parentId) affectedGroupIds.add(parentId);
};

const getAffectedParents = (): BackendRow[] => {
  const parents = [...affectedGroupIds]
    .map((id) => groups.get(id))
    .filter((p): p is BackendRow => p !== undefined);
  affectedGroupIds.clear();
  return parents;
};

getRowDeltaMessage: (json: any) => {
  affectedGroupIds.clear();

  const result = {
    ...json,
    add: json?.add?.map(processAddRow),
    update: json?.update?.map(processUpdateRow),
    remove: json?.remove?.map(processRemoveRow),
  };

  const parentUpdates = getAffectedParents();
  if (parentUpdates.length > 0) {
    result.update = [...(result.update || []), ...parentUpdates];
  }

  return result;
},