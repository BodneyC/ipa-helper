import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parseCommit, prependRelease, renderRelease } from './changelog';

const commit = (subject: string, body = '', hash = 'abcdef0123456789') => ({ hash, subject, body });

describe('parseCommit', () => {
  it('reads type, scope and description, and shortens the hash', () => {
    expect(parseCommit(commit('feat(pwa): offline support [M7.1]'))).toEqual({
      type: 'feat',
      scope: 'pwa',
      breaking: false,
      description: 'offline support [M7.1]',
      hash: 'abcdef0',
    });
    expect(parseCommit(commit('fix: typo'))?.scope).toBeUndefined();
  });

  it('spots breaking changes from ! or a BREAKING CHANGE footer', () => {
    expect(parseCommit(commit('feat(url)!: v2 fragments'))?.breaking).toBe(true);
    expect(
      parseCommit(commit('feat: x', 'Body.\n\nBREAKING CHANGE: old links break'))?.breaking,
    ).toBe(true);
  });

  it('ignores subjects that are not Conventional Commits', () => {
    expect(parseCommit(commit('Merge branch main'))).toBeUndefined();
    expect(parseCommit(commit('Feat: capitalised'))).toBeUndefined();
  });
});

describe('renderRelease (M7.3)', () => {
  it('groups user-facing changes oldest first and leaves out docs, tests, ci and chores', () => {
    const log = [
      commit('docs: tick M7.1', '', '3333333'),
      commit('fix(audio): clip cut short', '', '2222222'),
      commit('test(e2e): journey', '', '1111111'),
      commit('feat(palette): filter', '', '0000002'),
      commit('feat: scaffold', '', '0000001'),
    ];
    expect(renderRelease('1.0.0', '2026-11-05', log)).toBe(
      [
        '## 1.0.0 (2026-11-05)',
        '',
        '### Features',
        '',
        '- scaffold (0000001)',
        '- **palette:** filter (0000002)',
        '',
        '### Fixes',
        '',
        '- **audio:** clip cut short (2222222)',
        '',
      ].join('\n'),
    );
  });

  it('lists breaking changes first, and says when nothing changed for users', () => {
    expect(renderRelease('2.0.0', 'd', [commit('perf!: drop old cache', '', '9999999')])).toContain(
      '### Breaking changes\n\n- drop old cache (9999999)\n\n### Performance',
    );
    expect(renderRelease('1.0.1', 'd', [commit('docs: x')])).toBe(
      '## 1.0.1 (d)\n\nNo user-facing changes.\n',
    );
  });

  it('gives every feat and fix exactly one line', () => {
    const subject = fc
      .tuple(fc.constantFrom('feat', 'fix', 'docs', 'chore'), fc.stringMatching(/^[a-z ]{1,20}$/))
      .map(([type, text]) => `${type}: ${text}`);
    fc.assert(
      fc.property(fc.array(subject, { maxLength: 20 }), (subjects) => {
        const text = renderRelease(
          '1.0.0',
          'd',
          subjects.map((s) => commit(s)),
        );
        const expected = subjects.filter((s) => /^(?:feat|fix):/.test(s)).length;
        expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(expected);
      }),
    );
  });
});

describe('prependRelease', () => {
  it('starts a changelog, then puts each new release above the last', () => {
    const first = prependRelease('', '## 1.0.0 (a)\n\nNo user-facing changes.\n');
    expect(first).toMatch(/^# Changelog\n\nGenerated from Conventional Commits/);
    const second = prependRelease(first, '## 1.1.0 (b)\n\nNo user-facing changes.\n');
    expect(second.indexOf('## 1.1.0')).toBeLessThan(second.indexOf('## 1.0.0'));
    expect(second.match(/# Changelog/g)).toHaveLength(1);
  });
});
