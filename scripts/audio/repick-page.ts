// The listening page for picking symbol clips by ear, a set at a time. A local
// tool, not part of the app: plain HTML with system colours, like listen-page.ts.
import type { Candidate, SetName } from './repick';
import type { PhoneSymbol } from '../../src/domain/inventory/types';

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${String(c.codePointAt(0))};`);

const exampleOf = (symbol: PhoneSymbol) => {
  if (symbol.example === undefined) return '';
  const { word, highlight } = symbol.example;
  const [start, end] = highlight;
  return `${escape(word.slice(0, start))}<b>${escape(word.slice(start, end))}</b>${escape(word.slice(end))}`;
};

/** A rendered candidate: where its file is, and how long it lasts. */
export interface RenderedCandidate extends Candidate {
  readonly file: string;
  readonly seconds: number;
}

/** The clip the app plays now, copied beside the page. */
export interface CurrentClip {
  readonly id: string;
  readonly file: string;
  readonly text: string;
  readonly seconds: number;
}

const row = (
  name: string,
  value: string,
  label: string,
  text: string,
  seconds: number,
  file: string,
  extra = '',
) => `
        <label class="option${value === 'current' ? ' current' : ''}">
          <input type="radio" name="${escape(name)}" value="${escape(value)}">
          <span class="label">${label}${extra}</span>
          <code>${escape(text)}</code>
          <span class="secs${seconds > 1.2 ? ' long' : ''}">${seconds.toFixed(2)} s</span>
          <audio controls preload="none" src="${escape(file)}"></audio>
        </label>`;

/** How the page names its set and what it saves. */
const PAGES: Readonly<Record<SetName, { title: string; noun: string; file: string }>> = {
  vowels: { title: 'Vowel clip picks', noun: 'vowel', file: 'vowel-picks.json' },
  extended: { title: 'Full-IPA clip picks', noun: 'sound', file: 'extended-picks.json' },
};

/**
 * Renders the page. Picks and comments persist in localStorage and download as
 * `<set>-picks.json`. Every sound can also be marked `none`: the voice can't
 * produce it, so it gets no clip (#14).
 */
export const repickPage = (
  set: SetName,
  symbols: readonly PhoneSymbol[],
  rendered: readonly RenderedCandidate[],
  current: readonly CurrentClip[],
): string => {
  const { title, noun, file } = PAGES[set];
  const sections = symbols
    .map((symbol) => {
      const now = current.find((c) => c.id === symbol.id);
      const currentRow =
        now === undefined
          ? '<p class="none">No clip in the app yet.</p>'
          : row(
              symbol.id,
              'current',
              '<strong>CURRENT</strong> · the clip in the app now (pick this to keep it)',
              now.text,
              now.seconds,
              now.file,
            );
      const options = rendered
        .filter((r) => r.id === symbol.id)
        .map((r) =>
          row(
            symbol.id,
            r.key,
            escape(r.label),
            r.text,
            r.seconds,
            r.file,
            r.withConsonants === true ? ' <span class="tag">has consonants</span>' : '',
          ),
        )
        .join('');
      const noneRow = `
        <label class="option none-row">
          <input type="radio" name="${escape(symbol.id)}" value="none">
          <span class="label"><strong>NONE</strong> · Cori can't produce this sound: no clip, no play button</span>
        </label>`;
      return `
      <section class="sound" data-id="${escape(symbol.id)}">
        <h2><span class="ipa">${escape(symbol.ipa)}</span> <span>${escape(symbol.id)} · ${escape(symbol.name)} · ${exampleOf(symbol)}</span>
          <button type="button" class="play-all">▶ Play all</button>
          <button type="button" class="stop">■ Stop</button></h2>
        ${currentRow}
        ${options}
        ${noneRow}
        <label class="comment"><span>Comments on <span class="ipa">${escape(symbol.ipa)}</span> (Claude reads these when processing the picks)</span>
          <textarea name="comment-${escape(symbol.id)}" rows="2"></textarea>
        </label>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0 auto; max-width: 64rem; padding: 1rem; background: Canvas; color: CanvasText; }
  header { position: sticky; top: 0; z-index: 1; background: Canvas; padding: 0.5rem 0; border-bottom: 1px solid GrayText; }
  header p { margin: 0.3rem 0; }
  .sound { margin: 1.5rem 0; padding: 0.5rem 0.8rem; border: 1px solid GrayText; border-radius: 6px; }
  .sound.done { border-color: Highlight; }
  h2 { font-size: 1.1rem; font-weight: 600; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  .ipa { font-size: 1.6rem; font-family: "Charis SIL", "Doulos SIL", serif; }
  .option { display: grid; grid-template-columns: auto minmax(12rem, 1fr) 7rem 4rem minmax(10rem, 16rem); gap: 0.5rem; align-items: center; padding: 0.25rem 0.3rem; border-radius: 4px; }
  .option:has(input:checked) { background: color-mix(in srgb, Highlight 25%, transparent); }
  .option.playing { outline: 2px solid Highlight; }
  .current { border: 2px dashed GrayText; margin-bottom: 0.4rem; }
  .none-row { grid-template-columns: auto 1fr; border-top: 1px solid GrayText; margin-top: 0.3rem; }
  .tag { font-size: 0.75rem; border: 1px solid GrayText; border-radius: 999px; padding: 0 0.4rem; }
  .secs.long { color: Mark; background: MarkText; padding: 0 0.2rem; }
  code { font-family: "Charis SIL", "Doulos SIL", ui-monospace, serif; font-size: 1.05rem; }
  audio { width: 100%; height: 2rem; }
  .comment { display: grid; gap: 0.3rem; margin-top: 0.6rem; }
  textarea { font: inherit; width: 100%; box-sizing: border-box; }
  #status { margin-left: 1rem; font-weight: 600; }
</style>
</head>
<body>
<header>
  <strong>Pick one rendering per ${noun}, keep CURRENT, or pick NONE if Cori can't say it.</strong>
  <button id="download" type="button">Download ${file}</button>
  <span id="status"></span>
  <p>A dashed row is the clip the app plays now, where there is one. "▶ Play all" plays it, then each rendering in turn.
  A clip ships exactly as you hear it, including any vowels or consonants around the sound. If you want only the sound cut
  out of one, or want something not offered, say so in the comments. Picks and comments are saved in this
  browser as you go; when you're done, download the file and give Claude its path.</p>
</header>
<main>${sections}
</main>
<script>
  const KEY = 'ipa-helper:${set}-clip-picks';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
  const state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} status(); };
  const sections = [...document.querySelectorAll('.sound')];
  const status = () => {
    const done = sections.filter((s) => state[s.dataset.id]?.pick).length;
    document.getElementById('status').textContent = done + ' / ' + sections.length + ' picked';
    for (const s of sections) s.classList.toggle('done', Boolean(state[s.dataset.id]?.pick));
  };
  for (const section of sections) {
    const id = section.dataset.id;
    const entry = (state[id] ??= {});
    for (const radio of section.querySelectorAll('input[type=radio]')) {
      if (entry.pick === radio.value) radio.checked = true;
      radio.addEventListener('change', () => { entry.pick = radio.value; save(); });
    }
    const box = section.querySelector('textarea');
    box.value = entry.comment ?? '';
    box.addEventListener('input', () => { entry.comment = box.value; save(); });
  }
  // One clip at a time.
  let queue = [];
  const stopAll = () => {
    queue = [];
    for (const a of document.querySelectorAll('audio')) { a.pause(); a.currentTime = 0; }
    for (const o of document.querySelectorAll('.playing')) o.classList.remove('playing');
  };
  document.addEventListener('play', (e) => {
    for (const a of document.querySelectorAll('audio')) if (a !== e.target) a.pause();
    for (const o of document.querySelectorAll('.playing')) o.classList.remove('playing');
    e.target.closest('.option')?.classList.add('playing');
  }, true);
  const next = () => {
    const audio = queue.shift();
    if (audio === undefined) { for (const o of document.querySelectorAll('.playing')) o.classList.remove('playing'); return; }
    audio.currentTime = 0;
    audio.addEventListener('ended', () => setTimeout(next, 400), { once: true });
    audio.play().catch(next);
  };
  for (const section of sections) {
    section.querySelector('.play-all').addEventListener('click', () => {
      stopAll();
      queue = [...section.querySelectorAll('audio')];
      next();
    });
    section.querySelector('.stop').addEventListener('click', stopAll);
  }
  document.getElementById('download').addEventListener('click', () => {
    const out = {};
    for (const s of sections) {
      const entry = state[s.dataset.id] ?? {};
      if (entry.pick || entry.comment) out[s.dataset.id] = { pick: entry.pick, comment: entry.comment ?? '' };
    }
    const blob = new Blob([JSON.stringify(out, null, 2) + '\\n'], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: '${file}' });
    a.click();
  });
  status();
</script>
</body>
</html>
`;
};
