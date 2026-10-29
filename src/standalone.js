import { normalizeStory, validateStory } from './story.js';
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, x => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[x])); }
function standaloneRuntime() {
  const el = document.getElementById('reader'), back = document.getElementById('back'), key = 'fieldstoryforge.export.' + story.id;
  let state;
  function start() { return { sceneId: story.start, flags: {}, history: [] }; }
  function safeLoad() {
    try { const x = JSON.parse(localStorage.getItem(key)); return x && typeof x.sceneId === 'string' && story.scenes.some(s => s.id === x.sceneId) && Array.isArray(x.history) && x.history.length < 200 && x.flags && typeof x.flags === 'object' ? x : null; }
    catch { return null; }
  }
  state = safeLoad() || start();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[x]));
  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* noop */ } }
  function render() {
    const page = story.scenes.find(s => s.id === state.sceneId) || story.scenes[0];
    const visible = page.choices.filter(c => !c.condition || String(state.flags[c.condition.flag] ?? '') === String(c.condition.equals));
    el.innerHTML = '<article class="page"><div class="art">' +
      (page.image ? '<img alt="' + esc(page.imageAlt || page.artworkNote || 'Illustration') + '" src="' + page.image + '">' : '<span aria-hidden="true">✧</span>') +
      '</div><div class="story"><small>PAGE ' + (story.scenes.indexOf(page) + 1) + ' OF ' + story.scenes.length +
      '</small><h2>' + esc(page.title) + '</h2><p>' + esc(page.narration) + '</p>' +
      (page.dialogue ? '<blockquote>' + esc(page.dialogue) + '</blockquote>' : '') +
      (page.ending ? '<p class="muted">✦ The End ✦</p>' : '') + '<div class="choices" id="choices"></div></div></article>';
    const box = document.getElementById('choices');
    visible.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c.text;
      b.addEventListener('click', () => {
        if (!story.scenes.some(s => s.id === c.to)) return;
        state = { sceneId: c.to, flags: { ...state.flags }, history: [...state.history.slice(-199), { sceneId: state.sceneId, flags: { ...state.flags } }] };
        if (c.effect) state.flags[c.effect.flag] = c.effect.value;
        save(); render(); window.scrollTo({ top: 0, behavior: 'instant' });
      });
      box.append(b);
    });
    back.disabled = !state.history.length;
  }
  back.addEventListener('click', () => {
    if (!state.history.length) return;
    const prior = state.history.pop();
    state = { sceneId: prior.sceneId, flags: prior.flags, history: state.history };
    save(); render();
  });
  document.getElementById('restart').addEventListener('click', () => { state = start(); save(); render(); });
  render();
}
export function buildStandaloneHtml(input) {
  const story = normalizeStory(input);
  const validation = validateStory(story);
  if (validation.errors.length) throw new Error('Fix story links before publishing: ' + validation.errors.join(' '));
  const serialized = JSON.stringify(story).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const css = 'body{margin:0;background:#101321;color:#f4ead8;font:17px/1.7 Georgia,serif}main{max-width:850px;margin:5vh auto;padding:22px}header{display:flex;justify-content:space-between;align-items:center;gap:12px}small{color:#c3af88}.page{margin-top:22px;background:linear-gradient(150deg,#27253c,#161d2c);border:1px solid #665879;border-radius:22px;overflow:hidden;box-shadow:0 25px 75px #0008}.art{min-height:260px;background:radial-gradient(circle at 50% 40%,#8c607e,#373a65 35%,#17192a 80%);display:grid;place-items:center}.art img{display:block;width:100%;max-height:520px;object-fit:contain}.art span{font-size:82px;color:#f3d8a7}.story{padding:24px 32px 34px}h1{font-size:clamp(30px,5vw,48px);line-height:1.1}h2{font-size:30px;line-height:1.15}p{white-space:pre-wrap}.choices{display:grid;gap:10px;margin-top:22px}button{font:inherit;padding:12px 18px;background:#3f3658;color:white;border:1px solid #ae93be;border-radius:11px;cursor:pointer;text-align:left}button:hover,button:focus-visible{background:#625073;outline:2px solid #eacb86}button:disabled{opacity:.4}.muted{color:#d5c1ab}footer{margin-top:25px;display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}@media(prefers-reduced-motion:no-preference){.page{animation:appear .4s ease}@keyframes appear{from{opacity:.6;transform:translateY(7px)}}}';
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>' + escapeHtml(story.title) + '</title><style>' + css + '</style></head><body><main><header><div><small>FIELDSTORYFORGE · LIVING COMIC</small><h1>' + escapeHtml(story.title) + '</h1><small>' + escapeHtml(story.author) + '</small></div><button id="restart">Start over</button></header><div id="reader" aria-live="polite"></div><footer><button id="back">← Previous choice</button><small>Offline edition · Your progress stays in this browser</small></footer></main><script>const story=' + serialized + ';(' + standaloneRuntime.toString() + ')();</script></body></html>';
}
