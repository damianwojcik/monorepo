const previousSelectedViewId = hooks.usePrevious(selectedViewId);
const viewJustChanged = useRef(false);

useEffect(() => {
  if (previousSelectedViewId !== selectedViewId && previousSelectedViewId !== undefined) {
    console.log('!!! view changed', { previousSelectedViewId, selectedViewId });
    viewJustChanged.current = true;
  }
}, [previousSelectedViewId, selectedViewId]);

useEffect(() => {
  if (!viewJustChanged.current) return;
  viewJustChanged.current = false;

  console.log('!!! filters settled after view change', { filteringSpec: searchState.filteringSpec });

  if (!searchState.filteringSpec?.length) {
    console.log('!!! no filters, skipping handleUpdatePanels');
    return;
  }

  console.log('!!! calling handleUpdatePanels');
  handleUpdatePanels();
}, [searchState.filteringSpec]);