const [aggFuncsConfig, setAggFuncsConfig] = useState<search.SearchState['aggFuncsConfig']>(
  () => Object.fromEntries(...) // your existing build logic
);

const setActiveAggFunc = (colId: string, aggFunc: search.AggregationFunc | undefined) => {
  setAggFuncsConfig(prev => ({
    ...prev,
    [colId]: Object.fromEntries(
      Object.entries(prev[colId] ?? {}).map(([key, entry]) => [
        key,
        { ...entry, active: key === (aggFunc ?? 'none') },
      ])
    ),
  }));
};