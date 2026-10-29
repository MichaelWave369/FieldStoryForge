import React, { useState } from 'react';
import { makePanel, MAX_PANELS, PANEL_LAYOUTS } from './rung2.js';
import { imageFromFile } from './storage.js';

export function ComicPanels({ panels = [], layout = 'cinematic' }) {
  if (!panels.length) return null;
  return <div className={'comic-panels panel-layout-' + (PANEL_LAYOUTS.includes(layout) ? layout : 'cinematic')} aria-label="Illustrated comic panels">
    {panels.map((panel, i) => <section className="comic-panel" key={panel.id} aria-label={'Comic panel ' + (i + 1)}>
      <div className="panel-visual">
        {panel.image ? <img src={panel.image} alt={panel.imageAlt || panel.artworkNote || ('Artwork for panel ' + (i+1))}/> :
          <div className="panel-placeholder"><span aria-hidden="true">{['✦','☽','✧','❖','✺','✷','✶','✴'][i % 8]}</span><small>{panel.artworkNote || 'Artwork goes here'}</small></div>}
        {panel.caption && <p className="panel-caption">{panel.caption}</p>}
        {panel.dialogue && <p className="panel-dialogue">{panel.dialogue}</p>}
      </div>
      <span className="panel-mark">0{i + 1}</span>
    </section>)}
  </div>;
}

export function PanelComposer({ page, onUpdate, onNotice }) {
  const [busy, setBusy] = useState('');
  const panels = page.panels || [];
  const updatePanel = (id, field, value) => onUpdate('panels', panels.map(p=>p.id===id?{...p,[field]:value}:p));
  const swap = (index, direction) => {
    const nextIndex=index+direction;
    if (nextIndex<0 || nextIndex>=panels.length) return;
    const next=[...panels];
    [next[index],next[nextIndex]]=[next[nextIndex],next[index]];
    onUpdate('panels', next);
  };
  const upload = async (file, id) => {
    if (!file) return;
    setBusy(id);
    try {
      const image=await imageFromFile(file);
      updatePanel(id,'image',image);
      onNotice?.({type:'success',text:'Comic panel artwork added.'});
    } catch (e) { onNotice?.({type:'error',text:e.message}); }
    finally {setBusy('');}
  };
  return <section className="editor-card panel-composer" aria-label="Comic panel composer">
    <div className="aside-title"><div><h3>Comic panel composer</h3><p className="subtle">Build a page from illustrated panels, captions, and dialogue. All changes appear in the reader and exported HTML.</p></div><span className="count-pill">{panels.length}/{MAX_PANELS} panels</span></div>
    <label className="field"><span className="field-name">Page layout</span><select value={page.layout || 'cinematic'} onChange={e=>onUpdate('layout',e.target.value)}>
      {PANEL_LAYOUTS.map(key=><option value={key} key={key}>{({cinematic:'Cinematic • one large panel',grid:'Comic grid • two columns',stack:'Storyboard • stacked panels',split:'Split screen • mixed proportions'})[key]}</option>)}
    </select></label>
    {panels.length === 0 && <p className="subtle">No extra panels yet. The existing classic illustrated page remains active until you add a panel.</p>}
    {panels.map((panel,index)=><article className="panel-editor" key={panel.id}>
      <div className="panel-editor-heading"><strong>Panel {index+1}</strong><div className="inline-actions"><button className="button-small button-ghost" disabled={index===0} onClick={()=>swap(index,-1)} aria-label={'Move panel '+(index+1)+' up'}>↑ Move up</button><button className="button-small button-ghost" disabled={index===panels.length-1} onClick={()=>swap(index,1)} aria-label={'Move panel '+(index+1)+' down'}>↓ Move down</button><button className="icon-button danger-text" onClick={()=>onUpdate('panels',panels.filter(p=>p.id!==panel.id))} aria-label={'Delete panel '+(index+1)}>×</button></div></div>
      <div className="panel-edit-grid"><div className="panel-art-preview">
        {panel.image?<img src={panel.image} alt="Current comic panel illustration"/>:<div><span aria-hidden="true">✧</span><small>{panel.artworkNote||'Illustration placeholder'}</small></div>}
        <div className="inline-actions"><label className="button-small button-outline upload-label">{busy===panel.id?'Reading...':'Upload art'}<input type="file" hidden disabled={!!busy} accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{upload(e.target.files?.[0],panel.id);e.target.value='';}}/></label>{panel.image&&<button className="button-small button-ghost" onClick={()=>updatePanel(panel.id,'image','')}>Clear</button>}</div>
      </div><div className="panel-fields">
        <label className="field"><span className="field-name">Narration caption</span><textarea rows={2} maxLength={1500} value={panel.caption} onChange={e=>updatePanel(panel.id,'caption',e.target.value)} placeholder="Three days passed..."/></label>
        <label className="field"><span className="field-name">Speech bubble</span><textarea rows={2} maxLength={1000} value={panel.dialogue} onChange={e=>updatePanel(panel.id,'dialogue',e.target.value)} placeholder="“What happens next?”"/></label>
        <label className="field"><span className="field-name">Visual prompt / placeholder</span><input maxLength={500} value={panel.artworkNote} onChange={e=>updatePanel(panel.id,'artworkNote',e.target.value)} placeholder="Describe the illustration"/></label>
        <label className="field"><span className="field-name">Image alt text</span><input maxLength={220} value={panel.imageAlt} onChange={e=>updatePanel(panel.id,'imageAlt',e.target.value)} placeholder="Accessible image description"/></label>
      </div></div>
    </article>)}
    <div className="panel-composer-footer"><button className="button-outline" disabled={panels.length>=MAX_PANELS} onClick={()=>onUpdate('panels',[...panels,makePanel()])}>+ Add comic panel</button><span className="subtle">Max {MAX_PANELS} panels per scene · PNG, JPEG, WebP or GIF</span></div>
    {!!panels.length&&<div className="panel-preview"><h3>Live page preview</h3><ComicPanels panels={panels} layout={page.layout}/></div>}
  </section>;
}
