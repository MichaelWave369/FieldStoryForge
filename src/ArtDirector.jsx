import React, { useEffect, useMemo, useState } from 'react';
import { composeArtBrief, createPromptPack, ART_PRESETS } from './artDirector.js';
import { downloadText, filename, imageFromFile } from './storage.js';
import { newId } from './story.js';

export default function ArtDirector({story,onUpdate,onNotice}) {
  const [sceneId,setSceneId]=useState(story.start),[slot,setSlot]=useState('cover');
  const [candidate,setCandidate]=useState(null),[source,setSource]=useState('external-tool');
  const [altText,setAltText]=useState(''),[uploading,setUploading]=useState(false);
  const page=story.scenes.find(s=>s.id===sceneId)||story.scenes[0];
  const panels=page?.panels||[];
  const slotId=slot!=='cover'&&panels.some(p=>p.id===slot)?slot:'';
  const target=slotId?panels.find(p=>p.id===slotId):page;
  const brief=useMemo(()=>{
    try {return composeArtBrief(story,page.id,slotId);} catch {return null;}
  },[story,page.id,slotId]);
  useEffect(()=>{setCandidate(null);setAltText('');},[sceneId,slotId]);
  const updateShot=fn=>onUpdate(s=>({...s,scenes:s.scenes.map(sc=>{
    if(sc.id!==page.id)return sc;
    if(!slotId)return fn(sc);
    return {...sc,panels:sc.panels.map(p=>p.id===slotId?fn(p):p)};
  })}));
  const changePlan=(key,value)=>updateShot(x=>({...x,artPlan:{...(x.artPlan||{}),[key]:value}}));
  const changeStyle=(key,value)=>onUpdate(s=>({...s,artStyle:{...(s.artStyle||{}),[key]:value}}));
  const changeLocation=(id,key,value)=>onUpdate(s=>({...s,locations:s.locations.map(l=>l.id===id?{...l,[key]:value}:l)}));
  const alert=(type,text)=>onNotice?.({type,text});
  const copyText=async value=>{
    try {
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard not available');
      await navigator.clipboard.writeText(value);
      alert('success','Illustration prompt copied. Paste into your chosen image tool.');
    } catch {
      downloadText('fieldstory-shot-prompt.txt',value,'text/plain;charset=utf-8');
      alert('info','Clipboard unavailable. Downloaded a text prompt instead.');
    }
  };
  const loadCandidate=async file=>{
    if(!file)return;
    setUploading(true);
    try {
      const data=await imageFromFile(file);
      setCandidate(data);
      setAltText('');
      alert('info','Artwork is staged for review, not yet used in the comic. Approve it to publish.');
    } catch(e){alert('error',e.message);}
    finally{setUploading(false);}
  };
  const approve=()=>{
    if(!candidate||!brief)return;
    if(altText.trim().length<6)return alert('error','Write an image description (at least 6 characters) for readers using assistive technology.');
    updateShot(x=>({...x,image:candidate,imageAlt:altText.trim().slice(0,220),
      artMeta:{source,prompt:brief.prompt,negativePrompt:brief.negativePrompt,approvedAt:new Date().toISOString()}}));
    setCandidate(null);
    alert('success','Approved artwork is now part of the comic. Export a .fieldstory backup to preserve it.');
  };
  const pack=()=>{try {downloadText(filename(story.title)+'-art-briefs.json',JSON.stringify(createPromptPack(story),null,2));alert('success','Prompt pack exported without image files or credentials.');}catch(e){alert('error',e.message);}};
  const plan=target?.artPlan||{};
  return <section className="art-director">
    <div className="section-title"><div><div className="eyebrow">RUNG 3 · CONSISTENT WORLD BUILDING</div><h2>Art Director</h2></div><button className="button-outline" onClick={pack}>⇩ Export all shot prompts</button></div>
    <div className="editor-card"><h3>Story-wide visual identity</h3><p className="subtle">Define the look once. Each shot prompt reuses these choices; you approve every image before it enters a book.</p>
      <div className="form-grid"><label className="field"><span className="field-name">Illustration style</span><select aria-label="Illustration style" value={story.artStyle?.preset||'Painterly fantasy'} onChange={e=>changeStyle('preset',e.target.value)}>{ART_PRESETS.map(p=><option key={p}>{p}</option>)}</select></label><label className="field"><span className="field-name">Aspect ratio</span><select aria-label="Illustration aspect ratio" value={story.artStyle?.aspect||'3:4'} onChange={e=>changeStyle('aspect',e.target.value)}>{['3:4','4:3','16:9','9:16','1:1'].map(p=><option key={p}>{p}</option>)}</select></label></div>
      {story.artStyle?.preset==='Custom'&&<label className="field"><span className="field-name">Custom style</span><input maxLength={180} value={story.artStyle?.custom||''} onChange={e=>changeStyle('custom',e.target.value)}/></label>}
      <div className="form-grid"><label className="field"><span className="field-name">Palette and recurring colors</span><input maxLength={240} value={story.artStyle?.palette||''} onChange={e=>changeStyle('palette',e.target.value)} placeholder="Muted violet, copper and gold"/></label><label className="field"><span className="field-name">Mood and texture</span><input maxLength={240} value={story.artStyle?.mood||''} onChange={e=>changeStyle('mood',e.target.value)} placeholder="Dreamlike, hand-painted paper"/></label></div>
      <label className="field"><span className="field-name">Avoid across every illustration</span><textarea rows={2} maxLength={700} value={story.artStyle?.avoid||''} onChange={e=>changeStyle('avoid',e.target.value)} placeholder="No modern signage, no changed hair color"/></label>
    </div>
    <div className="editor-card"><div className="aside-title"><div><h3>Location bible</h3><p className="subtle">Set details that every illustration of a place should preserve.</p></div><button className="button-small button-primary" disabled={(story.locations||[]).length>=50} onClick={()=>onUpdate(s=>({...s,locations:[...(s.locations||[]),{id:newId('location'),name:'New location',description:'',definingDetails:'',image:''}]}))}>+ Add location</button></div>
      <div className="location-grid">{(story.locations||[]).map(l=><div className="location-card" key={l.id}><label className="field"><span className="field-name">Location name</span><input value={l.name} maxLength={90} onChange={e=>changeLocation(l.id,'name',e.target.value)}/></label><label className="field"><span className="field-name">Setting and atmosphere</span><textarea rows={2} maxLength={700} value={l.description} onChange={e=>changeLocation(l.id,'description',e.target.value)} /></label><label className="field"><span className="field-name">Fixed visual anchors</span><textarea rows={2} maxLength={700} value={l.definingDetails} placeholder="Same stained-glass window, winding stairs, yellow doors..." onChange={e=>changeLocation(l.id,'definingDetails',e.target.value)} /></label><button className="button-small button-ghost" onClick={()=>onUpdate(s=>({...s,locations:s.locations.filter(x=>x.id!==l.id)}))}>Remove location</button></div>)}</div>
      {!story.locations?.length&&<p className="subtle">No locations yet. Add your recurring settings here.</p>}
    </div>
    <div className="editor-card"><h3>Illustration shot planner</h3><p className="subtle">Choose a scene or panel, assign its cast and setting, then build a repeatable illustration prompt. No image service is contacted.</p>
      <div className="form-grid"><label className="field"><span className="field-name">Scene</span><select aria-label="Illustration scene" value={page.id} onChange={e=>{setSceneId(e.target.value);setSlot('cover');}}>{story.scenes.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label className="field"><span className="field-name">Artwork slot</span><select aria-label="Illustration artwork slot" value={slotId||'cover'} onChange={e=>setSlot(e.target.value)}><option value="cover">Classic scene illustration</option>{panels.map((p,i)=><option key={p.id} value={p.id}>Comic panel {i+1}</option>)}</select></label></div>
      <label className="field"><span className="field-name">Characters visible in this shot</span><span className="art-check-grid">{story.characters.length?story.characters.map(c=><label key={c.id} className="art-checkbox"><input type="checkbox" checked={(plan.characterIds||[]).includes(c.id)} onChange={e=>changePlan('characterIds',e.target.checked?[...(plan.characterIds||[]),c.id]:(plan.characterIds||[]).filter(id=>id!==c.id))}/><span>{c.name||'Unnamed character'}</span></label>):<span className="subtle">Create characters in the Characters tab first.</span>}</span></label>
      <label className="field"><span className="field-name">Location in this shot</span><select aria-label="Illustration location" value={plan.locationId||''} onChange={e=>changePlan('locationId',e.target.value)}><option value="">No linked location</option>{(story.locations||[]).map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
      <div className="form-grid"><label className="field"><span className="field-name">Camera and composition</span><input value={plan.composition||''} maxLength={500} onChange={e=>changePlan('composition',e.target.value)} placeholder="Wide shot through the attic doorway"/></label><label className="field"><span className="field-name">Lighting</span><input value={plan.lighting||''} maxLength={240} onChange={e=>changePlan('lighting',e.target.value)} placeholder="Side-lit by moonbeams"/></label></div>
      {brief&&<div className="art-brief"><div className="aside-title"><h3>Generated prompt (editable via the fields above)</h3><button className="button-small button-primary" onClick={()=>copyText(brief.prompt+'\n\nNEGATIVE PROMPT:\n'+brief.negativePrompt)}>Copy shot prompt</button></div><pre className="art-brief-text">{brief.prompt}</pre><div className="eyebrow">AVOID</div><p className="subtle">{brief.negativePrompt}</p>{brief.warnings.map((w,i)=><div className="notice" key={i}>{w}</div>)}</div>}
    </div>
    <div className="editor-card"><h3>Review and approve illustration</h3><p className="subtle">Generate art using any tool you choose or make it yourself. Then upload a candidate image. Nothing changes in the book until you explicitly approve it.</p>
      <div className="art-review-grid"><div className="art-review-preview">{candidate?<img src={candidate} alt="Unapproved artwork candidate"/>:target?.image?<img src={target.image} alt="Currently approved scene artwork"/>:<span>✧<small>No approved artwork yet</small></span>}</div><div className="art-review-controls">
        <label className="button-outline upload-label">↑ Upload artwork for review<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={e=>{loadCandidate(e.target.files?.[0]);e.target.value='';}}/></label>
        {candidate?<><div className="notice">Candidate preview only. The existing illustration remains unchanged.</div><label className="field"><span className="field-name">Artwork source</span><select aria-label="Artwork source" value={source} onChange={e=>setSource(e.target.value)}><option value="external-tool">External generation tool</option><option value="hand-drawn">Hand-drawn</option><option value="uploaded">Uploaded artwork</option><option value="other">Other</option></select></label><label className="field"><span className="field-name">Accessible image description (required)</span><textarea aria-label="Candidate image description" rows={2} maxLength={220} value={altText} onChange={e=>setAltText(e.target.value)} placeholder="A woman holding a lantern before a violet doorway"/></label><div className="inline-actions"><button className="button-primary" onClick={approve}>✓ Approve artwork</button><button className="button-ghost" onClick={()=>setCandidate(null)}>Discard candidate</button></div></>:<div className="subtle">After approval, the image and its prompt/source information are saved in the editable story file.</div>}
        {target?.artMeta?.approvedAt&&<div className="art-approved">Approved artwork · {target.artMeta.source||'uploaded'}<small>Approved {target.artMeta.approvedAt.slice(0,10)}</small></div>}
      </div></div>
    </div>
  </section>;
}
