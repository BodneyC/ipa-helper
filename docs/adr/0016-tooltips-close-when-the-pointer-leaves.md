# 0016. Close a key's tooltip when the pointer leaves it, with a setting to keep it open

- Status: Accepted
- Date: 2026-11-06
- Relates to: FR-2, FR-42, NFR-2

## Context
A palette key's tooltip (FR-2) opened on hover and, to meet WCAG 2.2 SC 1.4.13
("Hoverable"), stayed open while the pointer moved from the key onto the
tooltip, with a short grace period for the gap between them. In use, this
gets in the way. The tooltip sits over neighbouring keys and stays open while
the pointer passes through it on the way to them. The maintainer wants the
tooltip to close as soon as the pointer leaves the key.

The tooltip only repeats information that is available elsewhere: the key's
accessible name (glyph, IPA name, example word), its description (TIPA) and its
visible example label. Keyboard focus and long-press still open it, and Escape
still closes it.

## Options considered
1. **Keep it hoverable (status quo).** + meets SC 1.4.13 as written ·
   − the tooltip covers keys the user is reaching for.
2. **Close on leave, always.** + simplest · − users who magnify the screen, and
   need to move onto the tooltip to read it, lose the option entirely.
3. **Close on leave by default, with a setting that makes it hoverable.**
   + the default suits most users, and anyone who needs SC 1.4.13 behaviour can
   turn it on · − the default doesn't meet SC 1.4.13, so NFR-2 needs an exception.

## Decision
We will use option 3. A `hoverableTooltips` setting (default `false`, in
Settings under "Tooltips") decides how a key's tooltip behaves:

- **Off:** the tooltip closes as soon as the pointer leaves the key. Moving onto
  the tooltip doesn't keep it open.
- **On:** the old behaviour. The tooltip stays open while the pointer is over the
  key or the tooltip, with a 120 ms grace period between them.

Dismissal on Escape (SC 1.4.13 "Dismissible") and persistence while hovered
or focused ("Persistent") are unchanged in both modes.

## Consequences
- By default the app knowingly falls short of SC 1.4.13 "Hoverable" for palette
  tooltips. NFR-2 records this as the one exception, and it can be undone with the
  setting. axe doesn't test this criterion, so the e2e gates are unaffected.
- The setting is stored with the others (FR-42), and old stored settings get
  the default because `parseSettings` validates field by field.
- If users report that tooltips are hard to read under magnification, revisit
  the default.
