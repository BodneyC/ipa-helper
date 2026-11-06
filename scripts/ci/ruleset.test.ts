import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/** Jobs that run on PRs but deliberately don't gate merging (ADR-0005, ADR-0015). */
const ADVISORY = new Set(['visual (reviewed)']);

/** The status-check names the `main` ruleset requires. */
const requiredChecks = (): string[] => {
  const ruleset: unknown = JSON.parse(read('.github/rulesets/main.json'));
  const rules: unknown =
    typeof ruleset === 'object' && ruleset !== null ? Reflect.get(ruleset, 'rules') : undefined;
  if (!Array.isArray(rules)) return [];
  const contexts: string[] = [];
  for (const rule of rules) {
    if (typeof rule !== 'object' || rule === null) continue;
    if (Reflect.get(rule, 'type') !== 'required_status_checks') continue;
    const parameters: unknown = Reflect.get(rule, 'parameters');
    const checks: unknown =
      typeof parameters === 'object' && parameters !== null
        ? Reflect.get(parameters, 'required_status_checks')
        : undefined;
    if (!Array.isArray(checks)) continue;
    for (const check of checks) {
      const context: unknown =
        typeof check === 'object' && check !== null ? Reflect.get(check, 'context') : undefined;
      if (typeof context === 'string') contexts.push(context);
    }
  }
  return contexts;
};

/**
 * The check names a workflow's jobs report: each job-level `name:` (4-space
 * indent), with a `${{ matrix.browser }}` placeholder expanded over the matrix.
 */
const jobCheckNames = (workflow: string): string[] => {
  const text = read(workflow);
  const browsers = /^\s+browser: \[([^\]]+)\]$/m
    .exec(text)?.[1]
    ?.split(',')
    .map((browser) => browser.trim());
  return [...text.matchAll(/^ {4}name: (.+)$/gm)].flatMap(([, name = '']) =>
    name.includes('${{ matrix.browser }}')
      ? (browsers ?? []).map((browser) => name.replace('${{ matrix.browser }}', browser))
      : [name],
  );
};

describe('main branch ruleset (ADR-0015)', () => {
  const jobs = [
    ...jobCheckNames('.github/workflows/ci.yml'),
    ...jobCheckNames('.github/workflows/pr-title.yml'),
  ];
  const required = requiredChecks();

  it('requires only checks that a workflow job reports, so a renamed job cannot block every PR', () => {
    expect(required.length).toBeGreaterThan(0);
    expect(jobs).toEqual(expect.arrayContaining(required));
  });

  it('requires every PR job except the advisory ones, so a new gate cannot be skipped', () => {
    expect(new Set(required)).toEqual(new Set(jobs.filter((job) => !ADVISORY.has(job))));
  });
});
