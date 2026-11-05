/**
 * `pnpm changelog <version> [--dry-run]` (M7.3): adds a section for `<version>`
 * to CHANGELOG.md, built from the Conventional Commits since the last `v*` tag
 * (or since the first commit). With `--dry-run` it prints the section instead.
 * It doesn't bump `package.json`, commit or tag; RELEASING.md lists those steps.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { prependRelease, renderRelease } from './changelog';
import type { Commit } from './changelog';

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const lastTag = (): string | undefined => {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v*');
  } catch {
    return undefined;
  }
};

const commitsSince = (tag: string | undefined): Commit[] =>
  git('log', '--format=%H%x1f%s%x1f%b%x1e', ...(tag === undefined ? [] : [`${tag}..HEAD`]))
    .split('\x1e')
    .map((record) => record.trim())
    .filter((record) => record !== '')
    .map((record) => {
      const [hash = '', subject = '', body = ''] = record.split('\x1f');
      return { hash, subject, body };
    });

const [version, flag] = process.argv.slice(2);
if (version === undefined || !/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version)) {
  console.error('usage: pnpm changelog <semver, e.g. 1.0.0> [--dry-run]');
  process.exit(1);
}

const release = renderRelease(
  version,
  new Date().toISOString().slice(0, 10),
  commitsSince(lastTag()),
);
if (flag === '--dry-run') {
  console.log(release);
} else {
  const path = fileURLToPath(new URL('../../CHANGELOG.md', import.meta.url));
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  writeFileSync(path, prependRelease(existing, release));
  console.log(`CHANGELOG.md: added ${version}`);
}
