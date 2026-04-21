getRowDeltaMessage: (json: any) => {
  const result = {
    ...json,
    add: json?.add?.map(processAddRow),
    update: json?.update?.map(processUpdateRow),
    remove: json?.remove?.map(processRemoveRow),
  };

  // Check if parents are in matchedParents
  for (const [id, parent] of context.matchedParents) {
    console.log('!!! matchedParent:', id, 'deltaSize:', (parent as any).deltaSize);
  }

  return result;
},