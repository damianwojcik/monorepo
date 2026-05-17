type ExtendRowsMapperOptions = {
  groupByFields?: string[];
};

export const extendRowsMapper = <TRow extends data.UnknownRow>(
  prevRowsMapper: worker.RowsMapper<TRow>,
  options?: ExtendRowsMapperOptions,
): worker.RowsMapper<TRow> => {
  const groupByFields = options?.groupByFields ?? [];
  if (groupByFields.length === 0) return prevRowsMapper;

  return (allContexts, rows, maxRows, _includeParent) => {
    type Tuple = ReturnType<worker.RowsMapper<TRow>>[number];

    const tuplesWithoutParent = prevRowsMapper(allContexts, rows, Number.POSITIVE_INFINITY, false);
    const leafRows = tuplesWithoutParent.flat();

    // Build one synthetic parent row per group path prefix, in first-seen order.
    const parents = new Map<string, TRow>();

    const synthesizeParent = (path: string[]): TRow => {
      const id = parentIdForPath(path);
      const level = path.length - 1;
      const fields: Record<string, unknown> = {};
      groupByFields.forEach((field, i) => {
        fields[field] = i <= level ? path[i] : null;
      });
      return {
        id,
        ...fields,
        [pathField]: path,
        [childrenField]: [] as string[],
      } as unknown as TRow;
    };

    for (const row of leafRows) {
      const path = (row as Record<string, unknown>)[pathField] as string[];
      // path = [...ancestorGroupIds, row.id] — drop the leaf id, walk the prefixes.
      for (let depth = 1; depth < path.length; depth++) {
        const prefix = path.slice(0, depth);
        const id = parentIdForPath(prefix);
        if (!parents.has(id)) parents.set(id, synthesizeParent(prefix));
      }
    }

    // Depth-first = sort every row (parents + leaves) by path.
    const all: TRow[] = [...parents.values(), ...leafRows];
    all.sort((a, b) => {
      const pa = (a as Record<string, unknown>)[pathField] as string[];
      const pb = (b as Record<string, unknown>)[pathField] as string[];
      const n = Math.min(pa.length, pb.length);
      for (let i = 0; i < n; i++) {
        if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
      }
      return pa.length - pb.length;
    });

    return all.slice(0, maxRows).map((r) => [r] as Tuple);
  };
};