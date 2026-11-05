/**
 * Changelog from Conventional Commits (M7.3). Pure: `write-changelog.ts` feeds it
 * `git log` and writes the file.
 */

/** A commit as `git log` gives it. */
export interface Commit {
  readonly hash: string;
  readonly subject: string;
  readonly body: string;
}

interface ParsedCommit {
  readonly type: string;
  readonly scope: string | undefined;
  readonly breaking: boolean;
  readonly description: string;
  readonly hash: string;
}

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/;

/** Parses a Conventional Commit subject; `undefined` for anything else (e.g. merges). */
export const parseCommit = (commit: Commit): ParsedCommit | undefined => {
  const groups = HEADER.exec(commit.subject)?.groups;
  const type = groups?.['type'];
  const description = groups?.['description'];
  if (type === undefined || description === undefined) return undefined;
  return {
    type,
    scope: groups?.['scope'],
    breaking: groups?.['bang'] !== undefined || /^BREAKING[ -]CHANGE: /m.test(commit.body),
    description,
    hash: commit.hash.slice(0, 7),
  };
};

/** Sections in the order they appear. Types not listed (docs, test, ci…) are left out. */
const SECTIONS = [
  { title: 'Features', types: ['feat'] },
  { title: 'Fixes', types: ['fix'] },
  { title: 'Performance', types: ['perf'] },
] as const;

const line = (commit: ParsedCommit): string =>
  `- ${commit.scope === undefined ? '' : `**${commit.scope}:** `}${commit.description} (${commit.hash})`;

/**
 * One release's section: user-facing changes grouped by type, oldest first, with
 * breaking changes listed again at the top. `commits` come newest first, as
 * `git log` gives them.
 */
export const renderRelease = (
  version: string,
  date: string,
  commits: readonly Commit[],
): string => {
  const parsed = commits
    .map(parseCommit)
    .filter((commit) => commit !== undefined)
    .toReversed();
  const parts = [`## ${version} (${date})`];
  const breaking = parsed.filter((commit) => commit.breaking);
  if (breaking.length > 0) parts.push(`### Breaking changes\n\n${breaking.map(line).join('\n')}`);
  for (const { title, types } of SECTIONS) {
    const entries = parsed.filter((commit) => types.some((type) => type === commit.type));
    if (entries.length > 0) parts.push(`### ${title}\n\n${entries.map(line).join('\n')}`);
  }
  if (parts.length === 1) parts.push('No user-facing changes.');
  return `${parts.join('\n\n')}\n`;
};

const TITLE = '# Changelog\n\nGenerated from Conventional Commits by `pnpm changelog`.\n';

/** Adds a release's section to the top of an existing changelog (or starts one). */
export const prependRelease = (existing: string, release: string): string => {
  const rest = existing.startsWith(TITLE) ? existing.slice(TITLE.length).trimStart() : '';
  return `${TITLE}\n${release}${rest === '' ? '' : `\n${rest}`}`;
};
