import { normalizeStory } from './story.js';
const KEY = 'fieldstoryforge.library.v1';
const READER = 'fieldstoryforge.progress.v1.';
export function loadLibrary() {
  try { const raw = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(raw) ? raw.slice(0, 100).flatMap(s => { try { return [normalizeStory(s)]; } catch { return []; } }) : []; }
  catch { return []; }
}
export function saveLibrary(stories) {
  try { localStorage.setItem(KEY, JSON.stringify(stories)); return true; }
  catch { return false; }
}
export function saveProgress(storyId, progress) {
  try { localStorage.setItem(READER + storyId, JSON.stringify(progress)); } catch { /* private browsing */ }
}
export function loadProgress(storyId) {
  try {
    const data = JSON.parse(localStorage.getItem(READER + storyId) || 'null');
    if (!data || typeof data.sceneId !== 'string' || !Array.isArray(data.history) || data.history.length > 200) return null;
    if (!data.flags || typeof data.flags !== 'object') return null;
    return data;
  } catch { return null; }
}
export function clearProgress(storyId) { try { localStorage.removeItem(READER + storyId); } catch { /* noop */ } }
export function downloadText(name, contents, type = 'application/json') {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click();
  a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function filename(value) { return (value || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'story'; }
export function readStoryFile(file) {
  if (file.size > 8_000_000) return Promise.reject(new Error('Story file exceeds 8 MB.'));
  return file.text().then(text => normalizeStory(JSON.parse(text)));
}
export function imageFromFile(file) {
  if (!file || !['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) return Promise.reject(new Error('Upload a PNG, JPEG, WebP, or GIF image.'));
  if (file.size > 4_000_000) return Promise.reject(new Error('Images must be under 4 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read image.'));
    reader.onload = () => resolve(reader.result); reader.readAsDataURL(file);
  });
}
