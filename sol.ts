getRowDeltaMessage: (json: any) => {
  const result = {
    ...json,
    add: json?.add?.map(processAddRow),
    update: json?.update?.map(processUpdateRow),
    remove: json?.remove?.map(processRemoveRow),
  };

  const parentUpdates = [...groups.values()];
  console.log('!!! parentUpdates count:', parentUpdates.length, 'parents:', parentUpdates.map(p => p.id));
  result.update = [...(result.update || []), ...parentUpdates];

  return result;
},