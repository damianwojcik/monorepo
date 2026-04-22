const comparators = sorters?.map(createFieldCompare).filter(Boolean) ?? [];

console.log('!!! comparators count:', comparators.length);

return comparators.length > 0
  ? (idA, idB) => {
      const rowA = map.get(idA)!;
      const rowB = map.get(idB)!;
      console.log('!!! comparing ids:', idA, idB, 'rowA:', !!rowA, 'rowB:', !!rowB);
      for (let comparator of comparators) {
        const result = comparator(rowA, rowB);
        if (result !== sorting.Tie) {
          console.log('!!! result:', result);
          return result;
        }
      }
      return 0;
    }
  : null;