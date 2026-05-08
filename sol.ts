return comparators.length > 0
  ? (idA, idB) => {
      console.log('!!! CombinedComparator INVOKED', { idA, idB });
      const rowA = map.get(idA)!;
      const rowB = map.get(idB)!;
      for (let comparator of comparators) {
        const result = comparator(rowA, rowB);
        if (result !== sorting.Tie) {
          return result;
        }
      }
      return 0;
    }
  : null;