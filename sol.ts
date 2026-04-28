const getActiveAggFuncs = (aggFuncsConfig: SearchState['aggFuncsConfig']) =>
  Object.fromEntries(
    Object.entries(aggFuncsConfig).flatMap(([field, fieldConfig]) => {
      const activeKey = Object.entries(fieldConfig).find(([, entry]) => entry?.active === true)?.[0];
      return activeKey ? [[field, activeKey]] : [];
    }),
  );