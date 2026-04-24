(result as any)[`%${fieldKey}`] = {
  sum: search.aggFunctions.sum(values),
  min: search.aggFunctions.min(values),
  max: search.aggFunctions.max(values),
  first: search.aggFunctions.first(values),
  last: search.aggFunctions.last(values),
  none: search.aggFunctions.none(values),
  avg: search.aggFunctions.avg(values),
  count: search.aggFunctions.count(values),
};