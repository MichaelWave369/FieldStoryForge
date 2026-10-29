import React, { useMemo, useState } from 'react';
import { appendScenes, prepareManuscript } from './rung2.js';

const example = '# The First Door\n\nA small wooden door appeared in the attic.\n\nIt had not been there yesterday.\n\n# The Footsteps\n\nThere were footsteps beyond the walls.';
export default function ManuscriptImport({ story, onApply, onClose }) {
  const [text,setText]=useState(example);
  const [mode,setMode]=useState('append');
  const [error,setError]=useState('');
  const preview=useMemo(()=>{
    try { return {result:prepareManuscript(text),error:''}; }
    catch(e) { return {result:null,error:e.message}; }
  },[text]);
  const apply=()=>{
    setError('');
    if(!preview.result)return setError(preview.error);
    if(mode==='replace'&&!confirm('Replace the existing scenes with the imported manuscript? Download a .fieldstory backup first if needed.'))return;
    try {
      const imported=preview.result;
      const next=mode==='append' ? appendScenes(story,imported.scenes) :
        {...story,scenes:imported.scenes,start:imported.start,mapPositions:{}};
      onApply(next,imported.message);
      onClose();
    } catch(e) {setError(e.message);}
  };
  return <div className="modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal manuscript-modal" role="dialog" aria-modal="true" aria-labelledby="import-manuscript-title">
      <div className="section-title"><div><div className="eyebrow">LARRINA MODE · BRING YOUR OWN STORY</div><h2 id="import-manuscript-title">Import a manuscript</h2></div><button className="icon-button" onClick={onClose} aria-label="Close importer">×</button></div>
      <p className="subtle">Paste your story or load a .txt/.md file. Chapter headings become scenes. Unmarked passages are connected linearly; you can add decision branches afterward. For existing explicit choices, use <code>:: scene-id | Title</code> and <code>? Choice -&gt; destination</code>.</p>
      <label className="field"><span className="field-name">Story text</span><textarea rows={12} value={text} onChange={e=>setText(e.target.value)} aria-label="Story manuscript text" placeholder="Paste your story here" maxLength={250000}/></label>
      <label className="button-small button-outline upload-label">↑ Open .txt or .md<input type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>500000)throw new Error('Text file is too large.');setText(await f.text());setError('');}catch(ex){setError(ex.message);}e.target.value='';}}/></label>
      {preview.result?<div className="manuscript-preview"><div className="eyebrow">IMPORT PREVIEW</div><div className="preview-stats"><strong>{preview.result.scenes.length} scenes</strong><strong>{preview.result.scenes.reduce((n,s)=>n+s.choices.length,0)} choices</strong><strong>{preview.result.mode}</strong></div><ol>{preview.result.scenes.slice(0,12).map(s=><li key={s.id}><strong>{s.title}</strong> · {s.narration.length} characters {s.ending?'· ending':''}</li>)}</ol>{preview.result.scenes.length>12&&<p className="subtle">Plus {preview.result.scenes.length-12} more scenes.</p>}<p className="subtle">{preview.result.message}</p></div>:<div className="notice error" role="alert">{preview.error}</div>}
      {error&&<div className="notice error" role="alert">{error}</div>}
      <div className="import-controls"><label className="radio-option"><input type="radio" name="import-mode" checked={mode==='append'} onChange={()=>setMode('append')}/> Append scenes without replacing my work</label><label className="radio-option"><input type="radio" name="import-mode" checked={mode==='replace'} onChange={()=>setMode('replace')}/> Replace all existing scenes (with confirmation)</label></div>
      <div className="inline-actions"><button className="button-primary" disabled={!preview.result} onClick={apply}>Import {preview.result?.scenes.length||0} scenes</button><button className="button-ghost" onClick={onClose}>Cancel</button></div>
    </section>
  </div>;
}
