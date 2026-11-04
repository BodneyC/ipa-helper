# Architecture Decision Records

We record significant decisions in the [MADR](https://adr.github.io/madr/)-lite
format below. ADRs are **immutable once Accepted**: to change a decision, write a
new ADR that *supersedes* the old one, then update the old one's status line only.

Create a new one with `/adr <title>`. Number sequentially and zero-pad to four
digits.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-typescript-strict.md) | TypeScript with maximal strictness | Accepted |
| [0003](0003-toolchain-fnm-node-pnpm.md) | Toolchain: fnm, Node LTS, pnpm | Accepted |
| [0004](0004-vite-react.md) | Vite + React for the UI | Accepted |
| [0005](0005-quality-gates.md) | Quality gates: lint, format, tests, coverage | Accepted |
| [0006](0006-gruvbox-design-tokens.md) | Gruvbox theming via CSS design tokens | Accepted |
| [0007](0007-token-based-word-model.md) | Words are token lists, not strings | Accepted |
| [0008](0008-tipa-serialisation.md) | TIPA output via per-token encodings and a pluggable serialiser | Accepted |
| [0009](0009-audio-synthesis.md) | Free, sign-up-less British audio via in-browser synthesis | Proposed |
| [0010](0010-static-hosting-github-pages.md) | Static hosting on GitHub Pages via Actions | Accepted |

## Template

```markdown
# NNNN. Title in imperative mood

- Status: Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](…)
- Date: YYYY-MM-DD
- Relates to: FR-x, NFR-y, ADR-NNNN

## Context
What forces are at play? What problem needs a decision? Constraints, requirements.

## Options considered
1. **Option A**: summary. + pros / − cons
2. **Option B**: …

## Decision
We will … (one clear statement), followed by details.

## Consequences
Positive, negative and neutral outcomes; follow-up work; how we'd know it was wrong.
```
