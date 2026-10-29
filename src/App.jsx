import React, { useEffect, useMemo, useRef, useState } from 'react';
import { availableChoices, createStory, demoStory, goBack, newId, normalizeStory, parseOutline, scene, startReading, takeChoice, validateStory } from './story.js';
import { clearProgress, downloadText, filename, imageFromFile, loadLibrary, loadProgress, readStoryFile, saveLibrary, saveProgress } from './storage.js';
import { buildStandaloneHtml } from './standalone.js';
import { ComicPanels, PanelComposer } from './ComicPanels.jsx';
import StoryMap from './StoryMap.jsx';
import ManuscriptImport from './ManuscriptImport.jsx';
import './style.css';

const emptyOutline = ':: opening | The Beginning\nSomething remarkable happens.\n? Follow the sound -> hallway\n? Stay where you are -> safe\n\n:: hallway | The Hallway\nThere is a door ahead.\n? Open it -> safe\n\n:: safe | The End\nYou made your choice.\n! ending';
const genreIcons = ['✦', '☾', '✧', '❖', '✺', '✴'];
function Icon({ children }) { return <span aria-hidden="true">{children}</span>; }
function Field({ label, children, hint }) { return <label className="field"><span className="field-name">{label}</span>{children}{hint && <small className="hint">{hint}</small>}</label>; }
function Notice({ type = 'info', children }) { return <div className={'notice ' + type} role={type === 'error' ? 'alert' : 'status'}>{children}</div>; }

function Reader({ story, onExit, embedded = false }) {
  const [progress, setProgress] = useState(() => {
    const saved = loadProgress(story.id);
    return saved && story.scenes.some(s => s.id === saved.sceneId) ? saved : startReading(story);
  });
  useEffect(() => {
    const saved = loadProgress(story.id);
    setProgress(saved && story.scenes.some(s => s.id === saved.sceneId) ? saved : startReading(story));
  }, [story.id]);
  const current = story.scenes.find(s => s.id === progress.sceneId) || story.scenes.find(s => s.id === story.start) || story.scenes[0];
  const choices = availableChoices(current, progress.flags);
  const pageNumber = story.scenes.indexOf(current) + 1;
  const travel = next => { setProgress(next); saveProgress(story.id, next); };
  return <section className={'reader ' + (embedded ? 'reader-embedded' : '')} aria-label={'Reading ' + story.title}>
    <div className="reader-heading">
      <div><div className="eyebrow">✧ A FIELDSTORYFORGE LIVING COMIC</div><h1>{story.title}</h1><p className="book-byline">{story.author ? 'A story by ' + story.author : story.genre || 'Interactive comic'} · {story.scenes.length} scenes</p></div>
      <div className="reader-actions">
        {onExit && <button className="button-ghost" onClick={onExit}>← Studio</button>}
        <button className="button-ghost" onClick={() => { clearProgress(story.id); travel(startReading(story)); }}>↻ Restart</button>
      </div>
    </div>
    <div className="book-shell">
      <div className="book-ribbon"><span>CHAPTER {String(pageNumber).padStart(2, '0')}</span><span>{story.genre || 'YOUR STORY'}</span></div>
      <article className="book-page" key={current.id}>
        {current.panels?.length ? <ComicPanels panels={current.panels} layout={current.layout} /> : <div className={'comic-art art-' + (Math.max(0, pageNumber) % 6)}>
          {current.image ? <img src={current.image} alt={current.imageAlt || current.artworkNote || ('Illustration of ' + current.title)} /> :
            <div className="art-placeholder"><span className="art-ornament" aria-hidden="true">{genreIcons[Math.max(0, pageNumber) % genreIcons.length]}</span><div className="art-silhouette" aria-hidden="true"><i/><b/><i/></div><span className="art-subtitle">{current.artworkNote || 'Every story begins with a little wonder.'}</span></div>}
        </div>}
        <div className="story-panel">
          <div className="page-number">PAGE {pageNumber} / {story.scenes.length}</div>
          <h2>{current.title}</h2>
          <p className="narration">{current.narration || 'The story is waiting for its author...'}</p>
          {current.dialogue && <blockquote className="speech-bubble">{current.dialogue}</blockquote>}
          {current.ending && <div className="end-mark"><span>✦</span> THE END <span>✦</span></div>}
          {!current.ending && choices.length === 0 && <Notice type="info">No available choices on this page. The author may still be writing this path.</Notice>}
          {choices.length > 0 && <div className="story-choices" aria-label="Choose what happens next"><div className="choice-heading">WHAT HAPPENS NEXT?</div>{choices.map((c, i) =>
            <button key={c.id} className="choice-button" onClick={() => travel(takeChoice(story, progress, c.id))}><span className="choice-index">{String(i + 1).padStart(2, '0')}</span><span>{c.text || 'Continue'}</span><span aria-hidden="true">↗</span></button>
          )}</div>}
        </div>
      </article>
      <div className="reader-bottom"><button className="button-ghost" disabled={!progress.history.length} onClick={() => travel(goBack(progress))}>← Previous choice</button><span className="progress-marker">{progress.history.length} choice{progress.history.length === 1 ? '' : 's'} made · saved locally</span><button className="button-ghost" onClick={() => { clearProgress(story.id); travel(startReading(story)); }}>Start again ↻</button></div>
    </div>
  </section>;
}

function Shelf({ library, onOpen, onRead, onNew, onDuplicate, onDelete, onImport }) {
  const upload = useRef();
  return <main className="shelf">
    <div className="hero"><div className="eyebrow">A CREATIVE HOME FOR EVERY STORYTELLER</div><h1>Where stories <em>come alive.</em></h1><p>Write your world. Draw its doorways. Let readers choose what happens next. No coding, no account, and no permission required to imagine.</p><div className="hero-actions"><button className="button-primary" onClick={onNew}>✦ Create a new story</button><button className="button-outline" onClick={() => upload.current?.click()}>Import .fieldstory</button><input ref={upload} hidden type="file" accept=".fieldstory,.json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} /></div></div>
    <div className="section-title"><div><div className="eyebrow">YOUR PRIVATE LIBRARY</div><h2>The Bookshelf</h2></div><span className="count-pill">{library.length} {library.length === 1 ? 'story' : 'stories'}</span></div>
    <div className="book-grid">{library.map((story, i) => <article className={'shelf-card cover-' + (i % 6)} key={story.id}>
      <button className="cover-button" onClick={() => onRead(story.id)} aria-label={'Read ' + story.title}><span className="cover-spark">✧</span><span className="cover-overline">A LIVING COMIC</span><strong>{story.title}</strong><small>{story.author || 'A story waiting to be told'}</small><span className="cover-bottom">{story.genre || 'INTERACTIVE FICTION'}</span></button>
      <div className="card-info"><p>{story.description || 'A new story is taking shape.'}</p><div className="card-meta">{story.scenes.length} scenes <span>·</span> {story.scenes.filter(s => s.ending).length} endings</div><div className="card-actions"><button className="button-small button-primary" onClick={() => onOpen(story.id)}>Edit story</button><button className="button-small button-ghost" onClick={() => onRead(story.id)}>Read ↗</button><button className="icon-button" title="Duplicate story" aria-label={'Duplicate ' + story.title} onClick={() => onDuplicate(story.id)}>⧉</button><button className="icon-button danger-text" title="Delete story" aria-label={'Delete ' + story.title} onClick={() => onDelete(story.id)}>×</button></div></div>
    </article>)}</div>
    <div className="shelf-footer"><span>✧ Made for curious minds, by Φ369 Labs</span><span>Your stories live in this browser until you export them.</span></div>
  </main>;
}

function Studio({ story, onChange, onShelf, onRead, onUndo, onRedo, canUndo, canRedo }) {
  const [tab, setTab] = useState('pages');
  const [selectedId, setSelectedId] = useState(story.start);
  const [modal, setModal] = useState(false);
  const [outline, setOutline] = useState(emptyOutline);
  const [message, setMessage] = useState(null);
  const [artBusy, setArtBusy] = useState(false);
  const fileRef = useRef();
  useEffect(() => { setSelectedId(story.start); setTab('pages'); }, [story.id]);
  const selected = story.scenes.find(s => s.id === selectedId) || story.scenes[0];
  const validation = useMemo(() => validateStory(story), [story]);
  const update = fn => { onChange(old => normalizeStory({ ...fn(old), updatedAt: new Date().toISOString() })); };
  const updateStoryField = (key, value) => update(old => ({ ...old, [key]: value }));
  const updatePage = (key, value) => update(old => ({ ...old, scenes: old.scenes.map(s => s.id === selected.id ? { ...s, [key]: value } : s) }));
  const editChoice = (id, fn) => update(old => ({ ...old, scenes: old.scenes.map(s => s.id === selected.id ? { ...s, choices: s.choices.map(c => c.id === id ? fn(c) : c) } : s) }));
  const run = (action, success) => { try { action(); setMessage({ type: 'success', text: success }); } catch (e) { setMessage({ type: 'error', text: e.message }); } };
  const addPage = () => { const item = scene(); update(old => ({ ...old, scenes: [...old.scenes, item] })); setSelectedId(item.id); setTab('pages'); };
  const removePage = () => {
    if (story.scenes.length <= 1) return setMessage({ type: 'error', text: 'Every story needs at least one scene.' });
    if (!confirm('Delete this scene and unlink choices pointing to it?')) return;
    const next = story.scenes.find(s => s.id !== selected.id);
    update(old => ({ ...old, start: old.start === selected.id ? next.id : old.start, scenes: old.scenes.filter(s => s.id !== selected.id).map(s => ({ ...s, choices: s.choices.filter(c => c.to !== selected.id) })) }));
    setSelectedId(next.id);
  };
  const addChoice = () => {
    if (selected.choices.length >= 12) return;
    updatePage('choices', [...selected.choices, { id: newId('choice'), text: 'Continue...', to: story.scenes.find(s => s.id !== selected.id)?.id || selected.id, condition: null, effect: null }]);
  };
  const fileUpload = async file => {
    if (!file) return;
    setArtBusy(true);
    try { const value = await imageFromFile(file); updatePage('image', value); setMessage({ type: 'success', text: 'Artwork added to this scene.' }); }
    catch (e) { setMessage({ type: 'error', text: e.message }); }
    finally { setArtBusy(false); }
  };
  const publish = () => run(() => {
    const html = buildStandaloneHtml(story);
    downloadText(filename(story.title) + '.html', html, 'text/html;charset=utf-8');
  }, 'Standalone offline comic downloaded. Share the HTML file to let someone read without the studio.');
  const storyFile = () => run(() => downloadText(filename(story.title) + '.fieldstory', JSON.stringify(story, null, 2)), 'Editable story package downloaded.');
  const importOutline = () => run(() => {
    const result = parseOutline(outline);
    const next = normalizeStory({ ...story, scenes: result.scenes, start: result.start });
    if (!confirm('Replace the current scene graph with the imported outline? Your existing scenes will be removed.')) return;
    update(() => next); setSelectedId(next.start); setModal(false);
  }, 'Outline converted into editable scenes.');
  return <main className="workspace">
    <header className="workspace-header"><div><button className="breadcrumb" onClick={onShelf}>← Bookshelf</button><div className="workspace-title"><span className="brand-star">✧</span><div><div className="eyebrow">STORYFORGE · AUTHOR STUDIO</div><h1>{story.title}</h1></div></div></div><div className="toolbar"><button className="button-ghost" disabled={!canUndo} onClick={onUndo} aria-label="Undo last change" title="Undo last change">↶ Undo</button><button className="button-ghost" disabled={!canRedo} onClick={onRedo} aria-label="Redo last change" title="Redo last change">↷ Redo</button><button className="button-outline" onClick={storyFile}>⇩ Save .fieldstory</button><button className="button-outline" onClick={publish}>↗ Publish HTML</button><button className="button-primary" onClick={onRead}>▶ Read comic</button></div></header>
    <div className="editor-tabs" role="tablist" aria-label="Authoring sections">{[['pages','✦ Pages & choices'],['characters','♙ Characters'],['map','⑂ Story map'],['details','☷ Book details']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    {message && <div className="dismiss-message"><Notice type={message.type}>{message.text}</Notice><button className="icon-button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}
    {validation.errors.length > 0 && <Notice type="error">{validation.errors.length} publishing issue{validation.errors.length === 1 ? '' : 's'}: {validation.errors.slice(0, 3).join(' · ')}</Notice>}
    {tab === 'pages' && <div className="studio-columns">
      <aside className="page-sidebar"><div className="aside-title"><h2>Scenes</h2><span className="count-pill">{story.scenes.length}</span></div><div className="scene-list">{story.scenes.map((s, index) => <button key={s.id} className={'scene-link ' + (s.id === selected.id ? 'selected' : '')} onClick={() => setSelectedId(s.id)}><span className="scene-num">{String(index + 1).padStart(2, '0')}</span><span><strong>{s.title || s.id}</strong><small>{s.ending ? '✦ Ending' : s.choices.length + ' choices'}</small></span>{s.id === story.start && <span title="Starting scene">⌂</span>}</button>)}</div><button className="button-outline full" onClick={addPage}>+ Add scene</button><button className="link-button" onClick={() => setModal(true)}>⇧ Import manuscript or outline</button></aside>
      <section className="editor-body"><div className="section-title section-tight"><div><div className="eyebrow">COMIC PAGE EDITOR</div><h2>{selected.title}</h2></div><div className="title-actions"><button className="button-small button-ghost" disabled={story.scenes.length <= 1} onClick={removePage}>Delete scene</button></div></div>
        <div className="editor-card"><div className="form-grid"><Field label="Scene title"><input value={selected.title} maxLength={120} onChange={e => updatePage('title', e.target.value)} /></Field><Field label="Scene ID" hint="Stable ID used by choice links"><input readOnly value={selected.id} /></Field></div>
          <Field label="Narration"><textarea rows={6} value={selected.narration} maxLength={10000} onChange={e => updatePage('narration', e.target.value)} placeholder="What happens on this page?" /></Field>
          <Field label="Dialogue / speech bubble"><textarea rows={2} value={selected.dialogue} maxLength={3000} onChange={e => updatePage('dialogue', e.target.value)} placeholder="“Who goes there?”" /></Field>
          <div className="art-edit-row"><div className="mini-art">{selected.image ? <img src={selected.image} alt="Current scene artwork" /> : <span aria-hidden="true">✧</span>}</div><div className="art-edit-info"><strong>Scene illustration</strong><span>{selected.image ? 'Artwork included in exports' : 'Illustration optional. A designed placeholder is provided.'}</span><div className="inline-actions"><button className="button-small button-outline" disabled={artBusy} onClick={() => fileRef.current?.click()}>{artBusy ? 'Reading...' : 'Upload artwork'}</button>{selected.image && <button className="button-small button-ghost" onClick={() => updatePage('image', '')}>Remove</button>}</div><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { fileUpload(e.target.files?.[0]); e.target.value = ''; }} /></div></div>
          <Field label="Visual direction / placeholder caption"><input value={selected.artworkNote} maxLength={500} onChange={e => updatePage('artworkNote', e.target.value)} placeholder="Moonlight filters through a dusty attic..." /></Field><Field label="Image alt text"><input value={selected.imageAlt} maxLength={220} onChange={e => updatePage('imageAlt', e.target.value)} placeholder="Describe the image for screen-reader users" /></Field>
        </div>
        <PanelComposer page={selected} onUpdate={updatePage} onNotice={setMessage} />
        <div className="editor-card"><div className="aside-title"><div><h3>Reader choices</h3><p className="subtle">Each choice opens another page. Optional flags can remember earlier decisions.</p></div><label className="switch-label"><input type="checkbox" checked={selected.ending} onChange={e => update(old => ({ ...old, scenes: old.scenes.map(s => s.id === selected.id ? { ...s, ending: e.target.checked, choices: e.target.checked ? [] : s.choices } : s) }))} /> Ending page</label></div>
          {selected.ending ? <div className="ending-banner">✦ This page ends the current journey. Readers can restart to explore other paths.</div> :
            <>{selected.choices.map((c, i) => <div className="choice-editor" key={c.id}><div className="choice-editor-top"><strong>Choice {i + 1}</strong><button className="icon-button danger-text" aria-label={'Remove choice ' + (i + 1)} onClick={() => updatePage('choices', selected.choices.filter(x => x.id !== c.id))}>×</button></div><Field label="Reader sees"><input value={c.text} maxLength={160} onChange={e => editChoice(c.id, x => ({ ...x, text: e.target.value }))} /></Field><Field label="Go to scene"><select value={c.to} onChange={e => editChoice(c.id, x => ({ ...x, to: e.target.value }))}>{story.scenes.map(s => <option key={s.id} value={s.id}>{s.title} ({s.id})</option>)}</select></Field><div className="form-grid"><Field label="Only show if flag (optional)"><input value={c.condition?.flag || ''} placeholder="e.g. key" onChange={e => editChoice(c.id, x => ({ ...x, condition: e.target.value ? { flag: e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''), equals: x.condition?.equals || '' } : null }))} /></Field><Field label="Equals"><input disabled={!c.condition} value={c.condition?.equals || ''} placeholder="yes" onChange={e => editChoice(c.id, x => ({ ...x, condition: { ...x.condition, equals: e.target.value } }))} /></Field><Field label="Set flag on selection"><input value={c.effect?.flag || ''} placeholder="e.g. trust" onChange={e => editChoice(c.id, x => ({ ...x, effect: e.target.value ? { flag: e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''), value: x.effect?.value || '' } : null }))} /></Field><Field label="Value"><input disabled={!c.effect} value={c.effect?.value || ''} placeholder="yes" onChange={e => editChoice(c.id, x => ({ ...x, effect: { ...x.effect, value: e.target.value } }))} /></Field></div></div>)}<button className="button-outline full" disabled={selected.choices.length >= 12} onClick={addChoice}>+ Add reader choice</button></>}
        </div>
      </section>
    </div>}
    {tab === 'details' && <section className="editor-card single-panel"><div className="eyebrow">THE BOOK'S IDENTITY</div><h2>Book details</h2><Field label="Book title"><input maxLength={120} value={story.title} onChange={e => updateStoryField('title', e.target.value)} /></Field><div className="form-grid"><Field label="Author"><input value={story.author} maxLength={120} onChange={e => updateStoryField('author', e.target.value)} /></Field><Field label="Genre"><input maxLength={70} value={story.genre} onChange={e => updateStoryField('genre', e.target.value)} /></Field></div><Field label="Back cover description"><textarea rows={4} maxLength={1000} value={story.description} onChange={e => updateStoryField('description', e.target.value)} /></Field><Field label="Opening scene"><select value={story.start} onChange={e => updateStoryField('start', e.target.value)}>{story.scenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field><p className="subtle">Everything here stays local. Download .fieldstory regularly to keep a portable backup.</p></section>}
    {tab === 'characters' && <section className="single-panel"><div className="section-title"><div><div className="eyebrow">YOUR STORY BIBLE</div><h2>Characters</h2></div><button className="button-primary" onClick={() => update(s => ({ ...s, characters: [...s.characters, { id: newId('character'), name: 'New character', description: '', image: '' }] }))}>+ Character</button></div><div className="character-grid">{story.characters.map(c => <div className="editor-card" key={c.id}><div className="character-avatar">{c.image ? <img src={c.image} alt={c.name} /> : '♙'}</div><Field label="Name"><input value={c.name} onChange={e => update(s => ({ ...s, characters: s.characters.map(x => x.id === c.id ? { ...x, name: e.target.value } : x) }))} /></Field><Field label="Description & appearance"><textarea rows={4} value={c.description} onChange={e => update(s => ({ ...s, characters: s.characters.map(x => x.id === c.id ? { ...x, description: e.target.value } : x) }))} /></Field><div className="inline-actions"><label className="button-small button-outline upload-label">Upload portrait<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={async e => { const file=e.target.files?.[0]; if (!file) return; try { const image=await imageFromFile(file); update(s => ({ ...s, characters: s.characters.map(x => x.id === c.id ? { ...x, image } : x) })); } catch(err) { setMessage({type:'error',text:err.message}); } e.target.value=''; }} /></label><button className="button-small button-ghost" onClick={() => update(s => ({ ...s, characters: s.characters.filter(x => x.id !== c.id) }))}>Remove</button></div></div>)}</div>{story.characters.length === 0 && <div className="empty-state">Your characters are waiting to be imagined.</div>}</section>}
    {tab === 'map' && <section className="map-wide-panel"><div className="section-title"><div><div className="eyebrow">BEHIND EVERY TURN</div><h2>Visual story map & health</h2></div><span className="count-pill">{story.scenes.length} scenes · {story.scenes.filter(s => s.ending).length} endings</span></div><StoryMap story={story} onUpdate={fn=>update(fn)} onEdit={id=>{setSelectedId(id);setTab("pages");}} /><div className="editor-card"><h3>Branch connections</h3><p className="subtle">Follow each arrow to see where decisions lead. Cycles are allowed and bounded in reading history.</p><div className="graph-list">{story.scenes.map(s => <div className="graph-node" key={s.id}><button className="graph-title" onClick={() => { setSelectedId(s.id); setTab('pages'); }}><span>{s.id === story.start ? '⌂' : s.ending ? '✦' : '○'}</span>{s.title}</button><div className="graph-links">{s.choices.length ? s.choices.map(c => <span key={c.id}>{c.text || 'Choice'} <b>→</b> {story.scenes.find(x => x.id === c.to)?.title || 'Missing!'}</span>) : <em>{s.ending ? 'Ending' : 'No links'}</em>}</div></div>)}</div></div><div className="editor-card"><h3>Graph validation</h3>{validation.errors.length ? validation.errors.map((e, i) => <Notice type="error" key={i}>{e}</Notice>) : <Notice type="success">No broken links or structural errors. Ready for publishing.</Notice>}{validation.warnings.map((w, i) => <Notice key={i}>{w}</Notice>)}</div></section>}
    {modal && <ManuscriptImport story={story} onClose={() => setModal(false)} onApply={(next,message) => {
      update(() => next);
      setSelectedId(next.start);
      setTab('pages');
      setMessage({ type: 'success', text: message });
    }} />}
  </main>;
}

export default function App() {
  const [library, setLibrary] = useState(() => { const loaded = loadLibrary(); return loaded.length ? loaded : [demoStory()]; });
  const [activeId, setActiveId] = useState(() => library[0]?.id);
  const [screen, setScreen] = useState('shelf');
  const [alert, setAlert] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const importInput = useRef();
  useEffect(() => { setStorageOk(saveLibrary(library)); }, [library]);
  const current = library.find(s => s.id === activeId) || library[0];
  const history = useRef(new Map());
  const [historyVersion, setHistoryVersion] = useState(0);
  const modify = fn => {
    if (!current) return;
    const next = fn(current);
    if (next === current) return;
    const h = history.current.get(activeId) || { past: [], future: [] };
    h.past = [...h.past.slice(-39), current];
    h.future = [];
    history.current.set(activeId, h);
    setLibrary(list => list.map(s => s.id === activeId ? next : s));
    setHistoryVersion(x => x + 1);
  };
  const undo = () => {
    const h = history.current.get(activeId);
    if (!h?.past.length || !current) return;
    const previous = h.past.pop();
    h.future.push(current);
    setLibrary(list => list.map(s => s.id === activeId ? previous : s));
    setHistoryVersion(x => x + 1);
  };
  const redo = () => {
    const h = history.current.get(activeId);
    if (!h?.future.length || !current) return;
    const next = h.future.pop();
    h.past.push(current);
    setLibrary(list => list.map(s => s.id === activeId ? next : s));
    setHistoryVersion(x => x + 1);
  };
  const canUndo = (history.current.get(activeId)?.past.length || 0) > 0;
  const canRedo = (history.current.get(activeId)?.future.length || 0) > 0;
  const makeNew = () => { const story = createStory(); setLibrary(list => [...list, story]); setActiveId(story.id); setScreen('studio'); };
  const importFile = async file => { try { const story = await readStoryFile(file); const unique = { ...story, id: newId('story'), title: story.title + ' (imported)' }; setLibrary(list => [...list, unique]); setActiveId(unique.id); setScreen('studio'); setAlert(null); } catch (e) { setAlert(e.message); } };
  const duplicate = id => { const source = library.find(s => s.id === id); if (!source) return; const copy = normalizeStory({ ...source, id: newId('story'), title: source.title + ' (copy)' }); setLibrary(list => [...list, copy]); };
  const remove = id => { const source = library.find(s => s.id === id); if (!source || !confirm('Permanently delete "' + source.title + '" from this browser? Export a backup first if you want to keep it.')) return; setLibrary(list => list.filter(s => s.id !== id)); clearProgress(id); };
  return <div className="app"><div className="site-top"><button className="logo-button" onClick={() => setScreen('shelf')}><span className="logo-sigil">✦</span><span>FIELD<span className="gold">STORY</span>FORGE</span></button><span className="top-tag">THE LIVING COMIC STUDIO</span><div className="top-right"><span className="offline-dot" aria-hidden="true"/><span>LOCAL-FIRST · NO LOGIN</span><button className="top-help" onClick={() => { setAlert('Tip: Start with The Whispering Door. Open Edit story to change scenes, or Read to play. Export a .fieldstory file for backups and an HTML file to publish a finished comic.'); setScreen('shelf'); }}>?</button></div></div>
    {!storageOk && <Notice type="error">Browser storage is full or unavailable. Export your story now to avoid losing changes.</Notice>}
    {alert && <div className="global-alert"><Notice type="info">{alert}</Notice><button className="icon-button" aria-label="Dismiss" onClick={() => setAlert(null)}>×</button></div>}
    {screen === 'shelf' && <Shelf library={library} onNew={makeNew} onOpen={id => { setActiveId(id); setScreen('studio'); }} onRead={id => { setActiveId(id); setScreen('reader'); }} onDuplicate={duplicate} onDelete={remove} onImport={importFile} />}
    {screen === 'studio' && current && <Studio key={current.id} story={current} onChange={modify} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onShelf={() => setScreen('shelf')} onRead={() => setScreen('reader')} />}
    {screen === 'reader' && current && <Reader key={current.id} story={current} onExit={() => setScreen('studio')} />}
    {screen !== 'shelf' && <footer className="app-footer">✧ Your story. Your choices. Your world. <span>© FIELDSTORYFORGE · Φ369 LABS</span></footer>}
  </div>;
}
