const aggFuncsConfig: search.SearchState['aggFuncsConfig'] = Object.fromEntries(
  Object.entries(config.app.fields).flatMap(([field, { aggFuncs }]) => {
    if (!aggFuncs) return [];

    const withNone = aggFuncs.none ? aggFuncs : { none: { label: 'None' }, ...aggFuncs };
    const activeKey = Object.entries(withNone).find(([, entry]) => entry?.default === true)?.[0] ?? 'none';

    return [[field, Object.fromEntries(
      Object.entries(withNone).map(([key, entry]) => [
        key,
        key === activeKey ? { ...entry, active: true as const } : entry,
      ])
    )]];
  })
);