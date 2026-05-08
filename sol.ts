if (effectiveA.id !== effectiveB.id) {
  return comparator(parentProxy(effectiveA), parentProxy(effectiveB));
}
const result = comparator(rowA, rowB);
console.log('!!! same-group', {
  aId: rowA.id,
  bId: rowB.id,
  aVal: rowA[field],
  bVal: rowB[field],
  parent: effectiveA.id,
  result,
});
return result;