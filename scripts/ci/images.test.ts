import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const playwrightVersion = (): unknown => {
  const manifest: unknown = JSON.parse(read('package.json'));
  if (typeof manifest !== 'object' || manifest === null) return undefined;
  const dev: unknown = Reflect.get(manifest, 'devDependencies');
  return typeof dev === 'object' && dev !== null ? Reflect.get(dev, '@playwright/test') : undefined;
};

describe('CI container images', () => {
  it('run the Playwright image that matches @playwright/test, so its browsers are the ones the tests expect', () => {
    const tags = [
      ...read('.github/workflows/ci.yml').matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)-/g),
    ].map(([, version]) => version);
    expect(tags.length).toBeGreaterThan(0);
    // A Dependabot bump of @playwright/test fails here until the image tag follows.
    expect(new Set(tags)).toEqual(new Set([playwrightVersion()]));
  });
});
