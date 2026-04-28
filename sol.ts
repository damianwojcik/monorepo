const values = childRows
  .map((child) => {
    const raw = (child as Record<string, unknown>)[fieldKey];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  })
  .filter((v): v is number => v !== null);