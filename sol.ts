class GroupLevelRenderer implements community.ICellRendererComp {
  private eGui!: HTMLElement;

  init(params: community.ICellRendererParams & { level: number }) {
    this.eGui = document.createElement('span');
    this.render(params);
  }

  private render(params: community.ICellRendererParams & { level: number }) {
    this.eGui.innerHTML = '';
    this.eGui.style.display = 'flex';
    this.eGui.style.alignItems = 'center';
    this.eGui.style.gap = '4px';

    const rowLevel = getRowLevel(params.data);
    const value = params.valueFormatted ?? params.value ?? '';

    if (rowLevel !== params.level) {
      this.eGui.textContent = String(value);
      return;
    }

    const node = params.node;
    const expandable = node.expandable ?? (node.allChildrenCount ?? 0) > 0;

    if (expandable) {
      const chevron = document.createElement('span');
      chevron.className = `ag-icon ${node.expanded ? 'ag-icon-tree-open' : 'ag-icon-tree-closed'}`;
      chevron.style.cursor = 'pointer';
      chevron.addEventListener('click', () => node.setExpanded(!node.expanded));
      this.eGui.appendChild(chevron);
    }

    const label = document.createElement('span');
    label.textContent = String(value);
    this.eGui.appendChild(label);
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  refresh(params: community.ICellRendererParams & { level: number }): boolean {
    this.render(params);
    return true;
  }
}