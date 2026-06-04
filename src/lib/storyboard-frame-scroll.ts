/**
 * Scroll helpers for storyboard frame expand — align frame top below sticky chrome.
 * Client-safe math + DOM utilities (call only in browser).
 */

export const STORYBOARD_FRAME_SCROLL_INSET_PX = 16;

export const STORYBOARD_FRAME_ROW_ATTR = "data-storyboard-frame-row";

/** Pure scroll position for a row inside a scrollable container. */
export function frameScrollTopInContainer(
  containerScrollTop: number,
  rowTopInViewport: number,
  containerTopInViewport: number,
  stickyOffsetPx: number
): number {
  return Math.max(
    0,
    containerScrollTop + (rowTopInViewport - containerTopInViewport) - stickyOffsetPx
  );
}

/** Nearest scrollable ancestor (overflow auto/scroll with overflow content). */
export function findScrollableAncestor(
  start: HTMLElement,
  boundary?: HTMLElement | null
): HTMLElement | null {
  let el: HTMLElement | null = start.parentElement;
  while (el && el !== boundary) {
    if (el === document.documentElement || el === document.body) {
      break;
    }
    const { overflowY } = getComputedStyle(el);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

export type ScrollFrameRowIntoViewParams = {
  row: HTMLElement;
  /** Modal/page scroll body; when omitted, walks ancestors from the row. */
  scrollRoot?: HTMLElement | null;
  /** Space below sticky header + extra inset (default 16px). */
  stickyOffsetPx?: number;
  behavior?: ScrollBehavior;
};

/**
 * Scroll so the top of the frame row sits just below sticky modal/page chrome.
 * Prefers scrolling `scrollRoot` instead of the window when provided or detected.
 */
export function scrollFrameRowIntoView(params: ScrollFrameRowIntoViewParams): void {
  const stickyOffsetPx = params.stickyOffsetPx ?? STORYBOARD_FRAME_SCROLL_INSET_PX;
  const behavior = params.behavior ?? "smooth";
  const scrollRoot = params.scrollRoot ?? findScrollableAncestor(params.row);

  if (scrollRoot) {
    const rowRect = params.row.getBoundingClientRect();
    const rootRect = scrollRoot.getBoundingClientRect();
    const nextTop = frameScrollTopInContainer(
      scrollRoot.scrollTop,
      rowRect.top,
      rootRect.top,
      stickyOffsetPx
    );
    scrollRoot.scrollTo({ top: nextTop, behavior });
    return;
  }

  const rect = params.row.getBoundingClientRect();
  const top = frameScrollTopInContainer(window.scrollY, rect.top, 0, stickyOffsetPx);
  window.scrollTo({ top, behavior });
}
