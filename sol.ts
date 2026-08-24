@import (reference) '@uwr/colors/dist/colors';

@top-bar-height: 35px;
@gutter: 4px;

.main {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content {
  height: calc(100% - @top-bar-height);
  display: flex;
  padding: 0 @gutter;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  --views-w: 260px;

  &[data-dragging] {
    cursor: col-resize;
    user-select: none;
  }

  // neo-core-css override
  label {
    margin-top: 0;
    margin-bottom: 0;
  }

  // neo-core-css override
  input {
    margin: 0;
  }

  .left {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 var(--views-w);
    margin-right: @gutter;
    min-width: 0;
    // celowo BEZ overflow: hidden — przycięłoby uchwyt

    > * {
      min-width: 0;
      overflow: hidden;
    }
  }

  .handle {
    position: absolute;
    inset-block: 0;
    right: -@gutter;
    width: @gutter * 2;
    z-index: 2;
    padding: 0;
    border: 0;
    background: transparent;
    appearance: none;
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

    &:focus-visible {
      outline: 2px solid #0d6efd;
      outline-offset: -1px;
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

@media (prefers-reduced-motion: reduce) {
  .content .handle::after {
    transition: none;
  }
}