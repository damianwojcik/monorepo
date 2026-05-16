const GroupLevelRenderer = (params: community.ICellRendererParams & { level: number }) => {
  const rowLevel = getRowLevel(params.data);
  const isThisLevel = rowLevel === params.level;

  if (!isThisLevel) {
    return <span>{params.valueFormatted ?? params.value ?? ''}</span>;
  }

  const node = params.node;
  const expandable = node.expandable ?? (node.allChildrenCount ?? 0) > 0;

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {expandable && (
        <span
          className={`ag-icon ${node.expanded ? 'ag-icon-tree-open' : 'ag-icon-tree-closed'}`}
          onClick={() => node.setExpanded(!node.expanded)}
          style={{ cursor: 'pointer' }}
        />
      )}
      <span>{params.valueFormatted ?? params.value ?? ''}</span>
    </span>
  );
};

const getGroupRendererForLevel = (level: number): Partial<community.ColDef> => ({
  cellRenderer: GroupLevelRenderer,
  cellRendererParams: { level },
});

// in updateColumnDefs:
const level = groupByFields.indexOf(colDef.field);
return { ...colDef, ...getGroupRendererForLevel(level) };