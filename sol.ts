const resetAggFuncsConfig = () => {
  setAggFuncsConfig(prev => Object.fromEntries(
    Object.entries(prev).map(([field, fieldConfig]) => {
      const hasDefault = Object.values(fieldConfig).some(e => e?.default === true);
      return [
        field,
        Object.fromEntries(
          Object.entries(fieldConfig).map(([key, entry]) => [
            key,
            { ...entry, active: hasDefault ? entry?.default === true : key === 'none' },
          ])
        ),
      ];
    })
  ));
};