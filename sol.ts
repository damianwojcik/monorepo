  const ensureChainForRow = (path: string[]): string => {
    let parentKey: string | null = null;
 
    for (const [level] of path.entries()) {
      const group = ensureGroup(path, level);
      const key = toKey(path.slice(0, level + 1));
 
      // Link this group as a child of the group one level up.
      if (parentKey !== null) {
        const parent = groups.get(parentKey)!;
        const siblings = (parent as Record<string, unknown>)[
          childrenField
        ] as string[];
        if (!siblings.includes(group.id)) {
          siblings.push(group.id);
          console.log('!!! linked group', key, 'under parent', parentKey);
        }
      }
      parentKey = key;
    }
 
    return parentKey!; // last key visited = the leaf
  };