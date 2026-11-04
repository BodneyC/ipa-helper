import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import styles from './SymbolKey.module.css';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import type { SymbolLabels } from '../../../domain/serialise/labels';
import { ROVING_ITEM } from '../../components/roving-focus';
import { Tooltip } from '../../components/Tooltip';

interface SymbolKeyProps {
  readonly symbol: PhoneSymbol;
  readonly labels: SymbolLabels;
  /** FR-10: called on click, tap, Enter or Space. */
  readonly onActivate: (symbol: PhoneSymbol) => void;
}

/** How long a touch must last to count as a long-press (FR-2). */
export const LONG_PRESS_MS = 500;
/** Grace period for moving the pointer from the key onto its tooltip. */
const HOVER_CLOSE_MS = 120;

/**
 * A palette key (FR-2): the glyph with a small label under it (the example word,
 * or the name for marks with no example). Hover, focus or a
 * touch long-press shows a tooltip with the name, a highlighted example word and
 * the TIPA code. The tooltip stays open while hovered and closes on Escape
 * (WCAG 1.4.13). A long-press shows the tooltip without adding the symbol.
 */
export function SymbolKey({ symbol, labels, onActivate }: SymbolKeyProps) {
  const tooltipId = useId();
  const tipaId = useId();
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /** Counts activations; each new value remounts the pulse, restarting its animation. */
  const [pulses, setPulses] = useState(0);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const swallowClick = useRef(false);
  const lastPointer = useRef<string>('mouse');

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
    hoverTimer.current = window.setTimeout(() => {
      setHovered(false);
    }, HOVER_CLOSE_MS);
  };

  const pointerDown = (event: PointerEvent) => {
    lastPointer.current = event.pointerType;
    if (event.pointerType !== 'touch') return;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      swallowClick.current = true;
      setDismissed(false);
      setLongPressed(true);
    }, LONG_PRESS_MS);
  };
  const pointerEnd = () => {
    window.clearTimeout(pressTimer.current);
  };

  const { example } = symbol;
  const micro = example?.word ?? symbol.name;

  return (
    <>
      <button
        ref={setButton}
        type="button"
        className={styles['key']}
        aria-describedby={tipaId}
        {...{ [ROVING_ITEM]: '' }}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
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
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          setLongPressed(false);
        }}
        onKeyDown={(event) => {
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
          {labels.ipa}
          <span className="visuallyHidden">{example ? `, ${symbol.name}, as in ` : ', '}</span>
        </span>
        <span className={styles['micro']}>{micro}</span>
        {/* SPEC §6: a brief accent pulse says "just added". */}
        {pulses > 0 && <span key={pulses} className={styles['pulse']} aria-hidden="true" />}
      </button>
      <Tooltip
        id={tooltipId}
        anchor={button}
        open={open}
        onPointerEnter={enter}
        onPointerLeave={leave}
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
      </Tooltip>
    </>
  );
}
