import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import styles from './SymbolKey.module.css';
import { isSounding } from '../../../domain/inventory/index';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import type { SymbolLabels } from '../../../domain/serialise/labels';
import { ROVING_ITEM } from '../../components/roving-focus';
import { Tooltip } from '../../components/Tooltip';
import type { SymbolPlayer } from '../audio/use-audio';

interface SymbolKeyProps {
  readonly symbol: PhoneSymbol;
  readonly labels: SymbolLabels;
  /** FR-10: called on click, tap, Enter or Space. */
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /**
   * FR-30: plays symbols. Left out when audio is unavailable; a symbol it
   * can't play (a mark, or a sound with no clip) gets no play affordance.
   */
  readonly player?: SymbolPlayer | undefined;
  /**
   * FR-2 (ADR-0016): keep the tooltip open while the pointer is over it. Off by
   * default, so the tooltip closes as soon as the pointer leaves the key.
   */
  readonly hoverableTooltips?: boolean | undefined;
}

/** How long a touch must last to count as a long-press (FR-2). */
export const LONG_PRESS_MS = 500;
/** Grace period for moving the pointer from the key onto its tooltip. */
const HOVER_CLOSE_MS = 120;
/** Keys that don't, on their own, make pointer focus visible. */
const MODIFIERS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/**
 * A palette key (FR-2): the glyph with a small label under it (the example word,
 * or the name for marks with no example; none for a sound with no example).
 * Hover, keyboard focus or a
 * touch long-press shows a tooltip with the name, a highlighted example word and
 * the TIPA code. It closes on Escape and, by default, as soon as the pointer
 * leaves the key; with `hoverableTooltips` it stays open while the pointer is
 * over it (WCAG 1.4.13, ADR-0016). A long-press shows the tooltip without
 * adding the symbol.
 * Focus from a click or tap doesn't open it (#21), matching the browser's
 * `:focus-visible` heuristic: the next key press does.
 *
 * FR-30: a sounding key plays on Alt+click, Alt+Enter or long-press, and from
 * a small speaker button that appears while the key is hovered or focused. The
 * speaker is a pointer shortcut only: it is out of the tab order and hidden
 * from assistive technology, whose path is Alt+Enter (shown in the tooltip and
 * the help dialog).
 */
export function SymbolKey({
  symbol,
  labels,
  onActivate,
  player,
  hoverableTooltips = false,
}: SymbolKeyProps) {
  const play =
    player?.canPlay(symbol) === true
      ? () => {
          player.play(symbol);
        }
      : undefined;
  const tooltipId = useId();
  const tipaId = useId();
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  /** Keyboard focus only (`:focus-visible`); pointer focus leaves the tooltip shut (#21). */
  const [focused, setFocused] = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /** Counts activations; each new value remounts the pulse, restarting its animation. */
  const [pulses, setPulses] = useState(0);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const swallowClick = useRef(false);
  const lastPointer = useRef<string>('mouse');
  /** Set by a press, so the focus it causes doesn't open the tooltip. */
  const pointerFocus = useRef(false);

  const open = (hovered || focused || longPressed) && !dismissed;

  useEffect(
    () => () => {
      window.clearTimeout(hoverTimer.current);
      window.clearTimeout(pressTimer.current);
    },
    [],
  );

  // Scrolling moves the key away from a fixed-position tooltip, so close it. A
  // long-press tooltip also closes on the next touch anywhere.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHovered(false);
      setLongPressed(false);
    };
    window.addEventListener('scroll', close, { capture: true, passive: true });
    if (longPressed) document.addEventListener('pointerdown', close, { capture: true });
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      document.removeEventListener('pointerdown', close, { capture: true });
    };
  }, [open, longPressed]);

  const enter = () => {
    window.clearTimeout(hoverTimer.current);
    setDismissed(false);
    setHovered(true);
  };
  const leave = () => {
    window.clearTimeout(hoverTimer.current);
    if (!hoverableTooltips) {
      setHovered(false);
      return;
    }
    hoverTimer.current = window.setTimeout(() => {
      setHovered(false);
    }, HOVER_CLOSE_MS);
  };

  const pointerDown = (event: PointerEvent) => {
    lastPointer.current = event.pointerType;
    pointerFocus.current = true;
    setFocused(false);
    if (event.pointerType !== 'touch') return;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      swallowClick.current = true;
      setDismissed(false);
      setLongPressed(true);
      play?.();
    }, LONG_PRESS_MS);
  };
  const pointerEnd = () => {
    window.clearTimeout(pressTimer.current);
  };

  const { example } = symbol;
  // A sound without an example word (most of the full IPA) shows no label: its
  // chart row and column say what it is, and long names would widen every key.
  // Marks show their (short) name instead.
  const micro = example?.word ?? (isSounding(symbol) ? undefined : symbol.name);
  const hiddenMiddle =
    example !== undefined
      ? `, ${symbol.name}, as in `
      : micro === undefined
        ? `, ${symbol.name}`
        : ', ';

  return (
    <span className={styles['wrap']}>
      <button
        ref={setButton}
        type="button"
        className={styles['key']}
        aria-describedby={tipaId}
        {...{ [ROVING_ITEM]: '' }}
        onClick={(event) => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          if (event.altKey && play !== undefined) {
            play();
            return;
          }
          onActivate(symbol);
          setPulses((n) => n + 1);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') enter();
        }}
        onPointerLeave={leave}
        onPointerDown={pointerDown}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onContextMenu={(event) => {
          // Stop the mobile context menu stealing the long-press.
          if (lastPointer.current === 'touch') event.preventDefault();
        }}
        onFocus={() => {
          setDismissed(false);
          setFocused(!pointerFocus.current);
          pointerFocus.current = false;
        }}
        onBlur={() => {
          pointerFocus.current = false;
          setFocused(false);
          setLongPressed(false);
        }}
        onKeyDown={(event) => {
          // A key press after pointer focus makes focus visible, as browsers do.
          // Roving focus may already have moved on (and blurred this key) by now.
          const stillFocused = document.activeElement === event.currentTarget;
          if (stillFocused && event.key !== 'Escape' && !MODIFIERS.has(event.key)) {
            setFocused(true);
          }
          if (event.key === 'Enter' && event.altKey && play !== undefined) {
            // Without this the browser would also click, adding the symbol.
            event.preventDefault();
            play();
            return;
          }
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setDismissed(true);
          }
        }}
      >
        {/*
         * The accessible name is built from the content: "ʃ, voiceless
         * postalveolar fricative, as in ship" (ARCHITECTURE §6). The hidden
         * middle keeps the visible text in order inside it (WCAG 2.5.3). It
         * sits inside the glyph's span, and ends in a space, because browsers
         * add a space after each flex item; name computation collapses the two.
         */}
        <span className={styles['glyph']}>
          {labels.glyph}
          <span className="visuallyHidden">{hiddenMiddle}</span>
        </span>
        {micro !== undefined && <span className={styles['micro']}>{micro}</span>}
        {/* SPEC §6: a brief accent pulse says "just added". */}
        {pulses > 0 && <span key={pulses} className={styles['pulse']} aria-hidden="true" />}
      </button>
      {play !== undefined && (
        <button
          type="button"
          className={styles['play']}
          tabIndex={-1}
          aria-hidden="true"
          title={`Listen to ${labels.ipa}`}
          onClick={play}
        >
          <svg viewBox="0 0 16 16" className={styles['speaker']}>
            <path d="M2 6h3l4-3v10l-4-3H2z" />
            <path
              d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9"
              className={styles['waves']}
            />
          </svg>
        </button>
      )}
      <Tooltip
        id={tooltipId}
        anchor={button}
        open={open}
        {...(hoverableTooltips ? { onPointerEnter: enter, onPointerLeave: leave } : {})}
      >
        <span className={styles['tipName']}>{symbol.name}</span>
        {example && (
          <span className={styles['tipExample']}>
            {example.word.slice(0, example.highlight[0])}
            <strong>{example.word.slice(...example.highlight)}</strong>
            {example.word.slice(example.highlight[1])}
          </span>
        )}
        <span id={tipaId} className={styles['tipTipa']}>
          TIPA <code>{labels.tipa}</code>
        </span>
        {play !== undefined && (
          <span className={styles['tipHint']}>
            Listen: <kbd>Alt</kbd>+click or <kbd>Alt</kbd>+<kbd>Enter</kbd>
          </span>
        )}
      </Tooltip>
    </span>
  );
}
