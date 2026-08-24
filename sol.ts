import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN = 220;          // zmierz u siebie, patrz snippet niżej
const MIN_CONTENT = 480;  // ile musi zostać dla gridu
const DEFAULT = 260;
const MAX_RATIO = 0.5;

type Props = {
  stored?: number;
  onCommit: (width: number) => void;
};

export const useResizablePanel = ({ stored, onCommit }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const frame = useRef(0);

  const [containerW, setContainerW] = useState(0);
  const [width, setWidth] = useState(stored ?? DEFAULT);

  useEffect(() => {
    if (stored != null) setWidth(stored);
  }, [stored]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      // .content nie powinien rosnąć razem z panelem, ale gdyby CSS
      // gdzieś przeciekł — parent jest twardym sufitem i ucina pętlę
      const parentW = el.parentElement?.clientWidth ?? Number.POSITIVE_INFINITY;
      setContainerW(Math.min(entry.contentRect.width, parentW));
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const maxW = containerW
    ? Math.max(MIN, Math.min(containerW * MAX_RATIO, containerW - MIN_CONTENT))
    : DEFAULT; // fallback przed pierwszym callbackiem RO — nigdy Infinity

  const clamp = useCallback(
    (w: number) => Math.min(Math.max(w, MIN), maxW),
    [maxW],
  );

  // stored NIE jest przycinane przy zapisie, tylko przy renderze —
  // dzięki temu powrót na duży monitor przywraca oryginalną szerokość
  const effective = clamp(width);

  const paint = (w: number) => {
    contentRef.current?.style.setProperty('--views-w', `${w}px`);
  };

  useLayoutEffect(() => {
    if (!drag.current) paint(effective);
  }, [effective]);

  const commit = useCallback(
    (w: number) => {
      const next = clamp(w);
      setWidth(next);
      onCommit(next);
    },
    [clamp, onCommit],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: effective };
    contentRef.current?.setAttribute('data-dragging', 'true');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const next = clamp(d.w + (e.clientX - d.x));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      paint(next);
      handleRef.current?.setAttribute('aria-valuenow', String(Math.round(next)));
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(frame.current);
    contentRef.current?.removeAttribute('data-dragging');
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    commit(d.w + (e.clientX - d.x));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 48 : 16;
      commit(effective + (e.key === 'ArrowRight' ? step : -step));
    }
  };

  return {
    contentRef,
    handleProps: {
      ref: handleRef,
      type: 'button' as const,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick: () => commit(DEFAULT),
      role: 'separator' as const,
      'aria-orientation': 'vertical' as const,
      'aria-valuenow': Math.round(effective),
      'aria-valuemin': MIN,
      'aria-valuemax': Math.round(maxW),
      'aria-label': 'Resize views panel',
    },
  };
};

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  --views-w: 260px;
}

.left {
  position: relative;
  flex: 0 0 var(--views-w);
  min-width: 0;
  overflow: hidden;
}

.wrapper {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0; /* bez tego flex item nie zejdzie poniżej content size */
  min-height: 0;
  overflow: hidden;
}

/* Header z szerokim inputem wypycha layout, jeśli mu na to pozwolić */
.wrapper > * {
  min-width: 0;
}

.handle {
  position: absolute;
  inset-block: 0;
  right: -3px;
  width: 7px;
  z-index: 2;
  padding: 0;
  border: 0;
  background: transparent;
  touch-action: none;
  cursor: col-resize;
}

.handle::after {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 3px;
  width: 1px;
  background: #d4d4d4;
  transition: background-color 120ms ease, width 120ms ease;
}

.handle:hover::after,
.content[data-dragging] .handle::after {
  background: #0d6efd;
  width: 2px;
}

.handle:focus-visible {
  outline: 2px solid #0d6efd;
  outline-offset: -1px;
}

.content[data-dragging] {
  cursor: col-resize;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .handle::after {
    transition: none;
  }
}

const commitViewsPanelWidth = useMemo(
  () => debounce((w: number) => saveUserSetting('viewsPanelWidth', w), 500),
  [],
);
useEffect(() => () => commitViewsPanelWidth.flush(), [commitViewsPanelWidth]);

const { contentRef, handleProps } = useResizablePanel({
  stored: userSettings?.viewsPanelWidth,
  onCommit: commitViewsPanelWidth,
});

return (
  <div data-testid="RATES-NEXUS" className={s.main}>
    <ViewsTopBar stats={stats} />
    <div className={s.content} ref={contentRef}>
      <div className={s.left}>
        <ViewsPanel />
        <button className={s.handle} {...handleProps} />
      </div>
      <div data-testid="rates-nexus-grid" className={s.wrapper}>
        {/* bez zmian */}
      </div>
    </div>
  </div>
);