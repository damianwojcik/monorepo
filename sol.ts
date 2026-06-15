/* ===== Leg-line rendering for autoGroupColumnDef ===== */
:global(.ag-row):has(:global(.shallow-tree-child)) {

  /* DEBUG: turns the cell pink if the selector reaches it.
     Remove this rule once leg lines render. */
  :global(.auto-group-column) {
    background-color: rgba(255, 0, 0, 0.25) !important;
  }

  /* leg line — non-last child rows (vertical dashed run) */
  &:not(:global(.last-child-row)) :global(.auto-group-column) {
    background-repeat: repeat-y;
    background-position: top left;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 0 V24' stroke='%23999' stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E");
  }

  /* leg line — last child row (dashed elbow) */
  &:global(.last-child-row) :global(.auto-group-column) {
    background-repeat: no-repeat;
    background-position: top left;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 0 V12 H24' fill='none' stroke='%23999' stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E");
  }
}

/* Fallback anchor if .auto-group-column is module-hashed in the DOM.
   col-id is set by AG Grid and is never hashed. Uncomment to test. */
/*
:global(.ag-row):has(:global(.shallow-tree-child)) {
  :global([col-id="ag-Grid-AutoColumn"]) {
    background-color: rgba(255, 0, 0, 0.25) !important;
  }
  &:not(:global(.last-child-row)) :global([col-id="ag-Grid-AutoColumn"]) {
    background-repeat: repeat-y;
    background-position: top left;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 0 V24' stroke='%23999' stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E");
  }
  &:global(.last-child-row) :global([col-id="ag-Grid-AutoColumn"]) {
    background-repeat: no-repeat;
    background-position: top left;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 0 V12 H24' fill='none' stroke='%23999' stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E");
  }
}
*/