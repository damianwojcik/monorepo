import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_PANEL_WIDTH = 220;
const MIN_GRID_WIDTH = 480;
const DEFAULT_PANEL_WIDTH = 260;
const MAX_PANEL_RATIO = 0.5;

type DragState = {
  pointerStartX: number;
  panelStartWidth: number;
};

type Params = {
  storedWidth?: number;
  onCommit: (width: number) => void;
};

export const useResizablePanel = ({ storedWidth, onCommit }: Params) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const animationFrameIdRef = useRef(0);

  const [containerWidth, setContainerWidth] = useState(0);
  const [panelWidth, setPanelWidth] = useState(storedWidth ?? DEFAULT_PANEL_WIDTH);

  useEffect(() => {
    if (storedWidth != null) {
      setPanelWidth(storedWidth);
    }
  }, [storedWidth]);

  useLayoutEffect(() => {
    const contentElement = contentRef.current;

    if (!contentElement) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const parentWidth =
        contentElement.parentElement?.clientWidth ?? Number.POSITIVE_INFINITY;

      setContainerWidth(Math.min(entry.contentRect.width, parentWidth));
    });

    observer.observe(contentElement);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  const maxPanelWidth = containerWidth
    ? Math.max(
        MIN_PANEL_WIDTH,
        Math.min(containerWidth * MAX_PANEL_RATIO, containerWidth - MIN_GRID_WIDTH),
      )
    : DEFAULT_PANEL_WIDTH;

  const clampWidth = useCallback(
    (width: number) => Math.min(Math.max(width, MIN_PANEL_WIDTH), maxPanelWidth),
    [maxPanelWidth],
  );

  const visibleWidth = clampWidth(panelWidth);

  const applyWidth = (width: number) => {
    layoutRef.current?.style.setProperty('--views-panel-width', `${width}px`);
  };

  useLayoutEffect(() => {
    if (!dragStateRef.current) {
      applyWidth(visibleWidth);
    }
  }, [visibleWidth]);

  const commitWidth = useCallback(
    (width: number) => {
      const clampedWidth = clampWidth(width);

      setPanelWidth(clampedWidth);
      onCommit(clampedWidth);
    },
    [clampWidth, onCommit],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      pointerStartX: event.clientX,
      panelStartWidth: visibleWidth,
    };

    contentRef.current?.setAttribute('data-dragging', 'true');
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const nextWidth = clampWidth(
      dragState.panelStartWidth + (event.clientX - dragState.pointerStartX),
    );

    cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(() => applyWidth(nextWidth));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLSpanElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    dragStateRef.current = null;
    cancelAnimationFrame(animationFrameIdRef.current);
    contentRef.current?.removeAttribute('data-dragging');

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    commitWidth(
      dragState.panelStartWidth + (event.clientX - dragState.pointerStartX),
    );
  };

  return {
    layoutRef,
    contentRef,
    handleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onDoubleClick: () => commitWidth(DEFAULT_PANEL_WIDTH),
    },
  };
};

@import (reference) '@uwr/colors/dist/colors';

@top-bar-height: 35px;
@gutter: 4px;
@handle-hit-width: @gutter * 2;

.main {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;

  --views-panel-width: 260px;
}

.content {
  height: calc(100% - @top-bar-height);
  display: flex;
  padding: 0 @gutter;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  &[data-dragging] {
    cursor: col-resize;
    user-select: none;
  }

  label {
    margin-top: 0;
    margin-bottom: 0;
  }

  input {
    margin: 0;
  }

  .left {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 var(--views-panel-width);
    margin-right: @gutter;
    min-width: 0;

    > * {
      min-width: 0;
      overflow: hidden;
    }
  }

  .handle {
    position: absolute;
    inset-block: 0;
    right: -@gutter;
    width: @handle-hit-width;
    z-index: 2;
    touch-action: none;
    cursor: col-resize;

    &::after {
      content: '';
      position: absolute;
      inset-block: 0;
      left: @gutter - 1px;
      width: 1px;
      background: #d4d4d4;
      transition: background-color 120ms ease, width 120ms ease;
    }

    &:hover::after {
      background: #0d6efd;
      width: 2px;
    }
  }

  &[data-dragging] .handle::after {
    background: #0d6efd;
    width: 2px;
  }

  .wrapper {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;

    > * {
      min-width: 0;
    }
  }
}

.errors {
  > div:last-child {
    margin-bottom: 0;
  }
}


const { layoutRef, contentRef, handleProps } = useResizablePanel({
  storedWidth: userSettings?.viewsPanelWidth,
  onCommit: saveViewsPanelWidth,
});

return (
  <div data-testid="RATES-NEXUS" className={s.main} ref={layoutRef}>
    <ViewsTopBar stats={stats} />
    <div className={s.content} ref={contentRef}>
      <div className={s.left}>
        <ViewsPanel />
        <span className={s.handle} {...handleProps} />
      </div>
      <div data-testid="rates-nexus-grid" className={s.wrapper}>
        {/* bez zmian */}
      </div>
    </div>
  </div>
);