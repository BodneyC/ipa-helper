import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Marks an element as one stop in a roving-focus group. */
export const ROVING_ITEM = 'data-roving-item';

/** Centres closer than this (px) count as the same row for ↑/↓. */
const ROW_TOLERANCE = 8;

const itemsIn = (container: HTMLElement | null): readonly HTMLElement[] =>
  container === null ? [] : [...container.querySelectorAll<HTMLElement>(`[${ROVING_ITEM}]`)];

const centre = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/**
 * The item visually above or below `from`: the nearest row in that direction,
 * then the nearest item across in that row. Works for the consonant chart, the
 * vowel trapezoid and wrapping key rows alike.
 */
const vertical = (
  items: readonly HTMLElement[],
  from: HTMLElement,
  direction: 1 | -1,
): HTMLElement | undefined => {
  const origin = centre(from);
  const below = items
    .map((el) => ({ el, ...centre(el) }))
    .map((c) => ({ ...c, dy: (c.y - origin.y) * direction, dx: Math.abs(c.x - origin.x) }))
    .filter((c) => c.dy > ROW_TOLERANCE);
  const nearestRow = Math.min(...below.map((c) => c.dy));
  return below.filter((c) => c.dy - nearestRow <= ROW_TOLERANCE).toSorted((a, b) => a.dx - b.dx)[0]
    ?.el;
};

const NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

const target = (
  key: string,
  items: readonly HTMLElement[],
  from: HTMLElement,
): HTMLElement | undefined => {
  const index = items.indexOf(from);
  switch (key) {
    case 'ArrowLeft':
      return items[index - 1];
    case 'ArrowRight':
      return items[index + 1];
    case 'ArrowUp':
      return vertical(items, from, -1);
    case 'ArrowDown':
      return vertical(items, from, 1);
    case 'Home':
      return items[0];
    case 'End':
      return items.at(-1);
    default:
      return undefined;
  }
};

/**
 * Roving tabindex for a composite widget (FR-50, ARCHITECTURE §6). Put the
 * returned ref on the container, and {@link ROVING_ITEM} on each item. Exactly
 * one item is in the Tab order: the last one focused, or the first. Arrow keys,
 * Home and End move focus among the items; ← and → follow DOM order, ↑ and ↓
 * follow the layout. Navigation keys are `preventDefault`ed even at the edges,
 * so the global shortcuts (FR-51) never see them.
 */
export const useRovingFocus = <T extends HTMLElement>(): RefObject<T | null> => {
  const ref = useRef<T>(null);
  const current = useRef<HTMLElement | null>(null);

  // Items come and go (filtering, inventory), so re-check after every render.
  useLayoutEffect(() => {
    const items = itemsIn(ref.current);
    const active = items.find((item) => item === current.current) ?? items[0];
    for (const item of items) item.tabIndex = item === active ? 0 : -1;
  });

  useEffect(() => {
    const container = ref.current;
    if (container === null) return;
    const isItem = (el: EventTarget | null): el is HTMLElement =>
      el instanceof HTMLElement && el.hasAttribute(ROVING_ITEM);
    const onFocusIn = (event: FocusEvent) => {
      if (!isItem(event.target)) return;
      current.current = event.target;
      for (const item of itemsIn(container)) item.tabIndex = item === event.target ? 0 : -1;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (!isItem(event.target) || !NAVIGATION_KEYS.has(event.key)) return;
      event.preventDefault();
      target(event.key, itemsIn(container), event.target)?.focus();
    };
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return ref;
};
