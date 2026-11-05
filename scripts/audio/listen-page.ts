// The listening page for picking one frame per symbol (M4.3). A local tool,
// not part of the app: plain HTML with system colours.
import type { Rendered } from './clips';
import type { PhoneSymbol } from '../../src/domain/inventory/types';

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${String(c.codePointAt(0))};`);

const exampleOf = (symbol: PhoneSymbol) => {
  if (symbol.example === undefined) return '';
  const { word, highlight } = symbol.example;
  const [start, end] = highlight;
  return `${escape(word.slice(0, start))}<b>${escape(word.slice(start, end))}</b>${escape(word.slice(end))}`;
};

/** Renders the page. Picks persist in localStorage and download as picks.json. */
export const listeningPage = (
  symbols: readonly PhoneSymbol[],
  rendered: readonly Rendered[],
): string => {
  const rows = symbols
    .map((symbol) => {
      const options = rendered
        .filter((r) => r.id === symbol.id)
        .map(
          (r, i) => `
        <label class="option">
          <input type="radio" name="${symbol.id}" value="${r.frame}"${i === 0 ? ' data-first' : ''}>
          <span class="frame">${r.frame}</span> <code>${escape(r.text)}</code>
          <span class="secs${r.seconds > 1.2 ? ' long' : ''}">${r.seconds.toFixed(2)} s</span>
          <audio controls preload="none" src="${escape(r.file)}"></audio>
        </label>`,
        )
        .join('');
      return `
      <fieldset>
        <legend><span class="ipa">${escape(symbol.ipa)}</span> ${escape(symbol.id)} · ${escape(symbol.name)} · ${exampleOf(symbol)}</legend>
        ${options}
      </fieldset>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Symbol clip picks</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0 auto; max-width: 60rem; padding: 1rem; background: Canvas; color: CanvasText; }
  header { position: sticky; top: 0; background: Canvas; padding: 0.5rem 0; border-bottom: 1px solid GrayText; }
  fieldset { margin: 1rem 0; border: 1px solid GrayText; border-radius: 6px; }
  legend { font-size: 1.1rem; }
  .ipa { font-size: 1.6rem; font-family: "Charis SIL", "Doulos SIL", serif; margin-right: 0.3rem; }
  .option { display: grid; grid-template-columns: auto 8rem 6rem 4rem 1fr; gap: 0.5rem; align-items: center; padding: 0.2rem 0; }
  .secs.long { color: Mark; background: MarkText; padding: 0 0.2rem; }
  audio { width: 100%; height: 2rem; }
  #status { margin-left: 1rem; }
</style>
</head>
<body>
<header>
  <strong>Pick one rendering per symbol.</strong>
  Space plays the focused clip's control; picks are saved in this browser.
  <button id="defaults" type="button">Pick first option where unpicked</button>
  <button id="download" type="button">Download picks.json</button>
  <span id="status"></span>
  <p>Then run <code>pnpm audio:select path/to/picks.json</code>. To re-render symbols you dislike:
  <code>pnpm audio:candidates --only id,id</code> (each render differs; Piper samples noise).</p>
</header>
<main>${rows}
</main>
<script>
  const KEY = 'ipa-helper:symbol-clip-picks';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
  const picks = load();
  const radios = [...document.querySelectorAll('input[type=radio]')];
  const names = [...new Set(radios.map((r) => r.name))];
  const status = () => {
    const done = names.filter((n) => picks[n]).length;
    document.getElementById('status').textContent = done + ' / ' + names.length + ' picked';
  };
  for (const r of radios) {
    if (picks[r.name] === r.value) r.checked = true;
    r.addEventListener('change', () => {
      picks[r.name] = r.value;
      try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch {}
      status();
    });
  }
  // Only one clip plays at a time.
  document.addEventListener('play', (e) => {
    for (const a of document.querySelectorAll('audio')) if (a !== e.target) a.pause();
  }, true);
  document.getElementById('defaults').addEventListener('click', () => {
    for (const r of radios) if (r.dataset.first !== undefined && !picks[r.name]) { r.checked = true; r.dispatchEvent(new Event('change')); }
  });
  document.getElementById('download').addEventListener('click', () => {
    const sorted = Object.fromEntries(names.filter((n) => picks[n]).map((n) => [n, picks[n]]));
    const blob = new Blob([JSON.stringify(sorted, null, 2) + '\\n'], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'picks.json' });
    a.click();
  });
  status();
</script>
</body>
</html>
`;
};
