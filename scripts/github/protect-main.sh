#!/usr/bin/env bash
# protect-main.sh — apply ADR-0015: main changes only through squash-merged PRs
# whose required CI checks pass.
#
# 1. Repository merge settings: squash only, PR title and body as the squash
#    commit, auto-merge allowed, head branches deleted on merge.
# 2. The branch ruleset in .github/rulesets/main.json (created, or updated in
#    place if a ruleset with the same name exists).
#
# Idempotent. Needs: gh (authenticated as a repository admin), jq.
#
# Usage: ./scripts/github/protect-main.sh [--dry-run] [-R owner/repo]

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly RULESET="$SCRIPT_DIR/../../.github/rulesets/main.json"

dry_run=0
repo=""

while (($#)); do
  case "$1" in
    --dry-run) dry_run=1 ;;
    -R | --repo)
      repo="$2"
      shift
      ;;
    -h | --help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
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
jq empty "$RULESET"

[[ -n "$repo" ]] || repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
name="$(jq -r .name "$RULESET")"

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

echo "merge settings: $repo"
run gh api --method PATCH "repos/$repo" --silent \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY

existing_id="$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$name\") | .id")"
if [[ -n "$existing_id" ]]; then
  echo "ruleset: update '$name' ($existing_id)"
  run gh api --method PUT "repos/$repo/rulesets/$existing_id" --silent --input "$RULESET"
else
  echo "ruleset: create '$name'"
  run gh api --method POST "repos/$repo/rulesets" --silent --input "$RULESET"
fi

echo "Done. Required checks:"
jq -r '.rules[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context | "  " + .' "$RULESET"
