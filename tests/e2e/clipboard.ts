import type { Page } from '@playwright/test';

/** Records clipboard writes in the page, the same way in every browser. */
export const recordClipboard = (page: Page) =>
  page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(window, '__copied', { value: copied });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });
  });

export const copiedTexts = (page: Page) =>
  page.evaluate(() => {
    const value: unknown = Reflect.get(window, '__copied');
    return Array.isArray(value) ? value.map(String) : [];
  });
