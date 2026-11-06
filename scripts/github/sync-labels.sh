#!/usr/bin/env bash
# sync-labels.sh — make the repository's GitHub labels match docs/WORKFLOW.md §2.
#
# This file is the canonical label list. Colours are Gruvbox (ADR-0006).
# Idempotent: creates missing labels and updates colour/description of existing
# ones. GitHub's default labels are renamed (not recreated) so that issues
# already carrying them keep them.
#
# Usage: ./scripts/github/sync-labels.sh [--dry-run] [--prune] [-R owner/repo]
#   --dry-run  Print what would change; change nothing
#   --prune    Also delete labels that are not in the list below (asks first)
#   -R         Target repository (default: the current directory's repo)
#
# Needs: gh (authenticated), jq.

set -Eeuo pipefail

dry_run=0
prune=0
repo_args=()

while (($#)); do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --prune) prune=1 ;;
    -R | --repo)
      repo_args=(-R "$2")
      shift
      ;;
    -h | --help)
      sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
  shift
done

command -v gh > /dev/null || { echo "gh is required" >&2; exit 1; }
command -v jq > /dev/null || { echo "jq is required" >&2; exit 1; }

# name|colour (no #)|description
readonly LABELS=(
  "type: bug|cc241d|Behaviour differs from the spec, or something breaks"
  "type: feature|98971a|New or changed user-visible behaviour"
  "type: task|458588|Engineering work with no visible behaviour change"
  "type: docs|83a598|Documentation only"
  "type: chore|928374|Tooling, dependencies, CI, housekeeping"
  "type: spike|b16286|Time-boxed investigation; output is an ADR or findings"
  "type: question|d3869b|Needs an answer, not a change"

  "priority: P0|fb4934|Critical: site broken, data loss, wrong copied output, a11y blocker"
  "priority: P1|fe8019|High: before the next roadmap task"
  "priority: P2|fabd2f|Medium: planned, worked in roadmap order"
  "priority: P3|d5c4a1|Low: nice to have"

  "status: triage|d65d0e|New; needs labelling and a priority"
  "status: needs-info|bdae93|Waiting for the reporter"
  "status: ready|b8bb26|Triaged with acceptance criteria; can be picked up"
  "status: in-progress|8ec07c|Assigned and being worked on"
  "status: in-review|689d6a|A linked PR is open"
  "status: blocked|9d0006|Cannot proceed; the issue says what blocks it"

  "area: inventory|665c54|Symbol data: RP and full IPA inventories, diacritics"
  "area: serialise|665c54|IPA/TIPA/Piper serialisers, URL codec, paste parser"
  "area: editor|665c54|Word model, cursor, undo/redo, saved words"
  "area: palette|665c54|Consonant chart, vowel trapezoid, key grids, filter"
  "area: output|665c54|Word display, IPA/TIPA output rows, copy"
  "area: audio|665c54|Symbol clips, word synthesis, voice model"
  "area: theme|665c54|Gruvbox tokens, themes, fonts, layout"
  "area: pwa|665c54|Manifest, service worker, offline"
  "area: ci|665c54|Actions, deploy, Lighthouse, visual baselines, TeX job"
  "area: deps|665c54|Dependency updates"
  "area: docs|665c54|Spec, architecture, ADRs, README"

  "size: S|ebdbb2|Under an hour"
  "size: M|d5c4a1|One sitting; one PR"
  "size: L|bdae93|More than one PR: split before starting"

  "accessibility|8f3f71|Affects assistive tech, keyboard or contrast users"
  "regression|af3a03|It used to work"
  "needs: human|076678|Needs a person: device, manual QA, judgement. Agents skip it"
  "needs: decision|427b58|Blocked on a maintainer decision; often leads to an ADR"
  "good first issue|79740e|Small, well-described, low risk"
  "help wanted|b57614|A contribution would be welcome"

  "resolution: duplicate|7c6f64|Closed: duplicate of another issue"
  "resolution: wontfix|7c6f64|Closed: deliberately not doing this"
  "resolution: invalid|7c6f64|Closed: not a bug, or cannot reproduce"
)

# GitHub default label → our label. Renaming keeps existing issue assignments.
readonly RENAMES=(
  "bug|type: bug"
  "enhancement|type: feature"
  "documentation|type: docs"
  "question|type: question"
  "duplicate|resolution: duplicate"
  "wontfix|resolution: wontfix"
  "invalid|resolution: invalid"
  "dependencies|area: deps"
)

run() {
  if ((dry_run)); then
    {
      printf '[dry-run]'
      printf ' %q' "$@"
      echo
    } >&2
  else
    "$@"
  fi
}

existing="$(gh label list "${repo_args[@]}" --limit 500 --json name --jq '.[].name')"
has_label() { grep -Fxq -- "$1" <<< "$existing"; }

for pair in "${RENAMES[@]}"; do
  from="${pair%%|*}"
  to="${pair#*|}"
  if has_label "$from" && ! has_label "$to"; then
    echo "rename: $from → $to"
    run gh label edit "$from" "${repo_args[@]}" --name "$to"
  fi
done

# Re-read after renames (skipped in a dry run, where nothing changed).
((dry_run)) || existing="$(gh label list "${repo_args[@]}" --limit 500 --json name --jq '.[].name')"

wanted=()
for entry in "${LABELS[@]}"; do
  IFS='|' read -r name colour description <<< "$entry"
  wanted+=("$name")
  echo "upsert: $name"
  run gh label create "$name" "${repo_args[@]}" --color "$colour" --description "$description" --force > /dev/null
done

if ((prune)); then
  extra=()
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    printf '%s\n' "${wanted[@]}" | grep -Fxq -- "$name" || extra+=("$name")
  done <<< "$existing"
  if ((${#extra[@]})); then
    echo "Labels not in the list:"
    printf '  %s\n' "${extra[@]}"
    read -r -p "Delete them? [y/N] " answer
    if [[ "$answer" == [yY] ]]; then
      for name in "${extra[@]}"; do
        run gh label delete "$name" "${repo_args[@]}" --yes
      done
    fi
  fi
fi

echo "Done."
