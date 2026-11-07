import type { Downloads } from '../domain/ports';

/** The parts of the page a download needs; the real `document` and `URL` satisfy them. */
interface DownloadPage {
  readonly createAnchor: () => Pick<HTMLAnchorElement, 'href' | 'download' | 'click'>;
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
}

const browserPage = (): DownloadPage => ({
  createAnchor: () => document.createElement('a'),
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => {
    URL.revokeObjectURL(url);
  },
});

/**
 * The Downloads port (FR-18): clicks a temporary `<a download>` pointing at a
 * blob URL, which the browser saves without leaving the page.
 */
export const createBrowserDownloads = (page: DownloadPage = browserPage()): Downloads => ({
  saveText: (name, text, type) => {
    const url = page.createObjectURL(new Blob([text], { type }));
    const anchor = page.createAnchor();
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    // The click has started the download; the URL is no longer needed.
    page.revokeObjectURL(url);
  },
});
