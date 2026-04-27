  // Initialize aggFuncsConfig from config.app.fields whenever the field config changes.
  // This replaces the useState initializer that used to live here.
  useEffect(() => {
    const initial = Object.fromEntries(
      Object.entries(config.app.fields).flatMap(([field, { aggFuncs }]) => {
        if (!aggFuncs) return [];
        return [[field, aggFuncs]];
      }),
    );
    setSearchState((prev) => ({
      ...prev,
      aggFuncsConfig: initial,
      aggFuncsConfigVersion: id(),
    }));
  }, [config.app.fields]);

  const setActiveAggFunc = (colId: string, aggFunc: search.AggregationFunc) => {
    setSearchState((prev) => ({
      ...prev,
      aggFuncsConfig: {
        ...prev.aggFuncsConfig,
        [colId]: Object.fromEntries(
          Object.entries(prev.aggFuncsConfig[colId] ?? {}).map(([key, entry]) => [
            key,
            { ...entry, active: key === aggFunc },
          ]),
        ),
      },
      aggFuncsConfigVersion: id(),
    }));
  };

  const resetAggFuncsConfig = () => {
    setSearchState((prev) => ({
      ...prev,
      aggFuncsConfig: Object.fromEntries(
        Object.entries(prev.aggFuncsConfig).map(([field, fieldConfig]) => [
          field,
          Object.fromEntries(
            Object.entries(fieldConfig).map(([key, entry]) => [
              key,
              { ...entry, active: entry?.default === true },
            ]),
          ),
        ]),
      ),
      aggFuncsConfigVersion: id(),
    }));
  };