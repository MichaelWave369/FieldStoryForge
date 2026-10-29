import { newId, parseOutline, scene } from './story.js';

export const PANEL_LAYOUTS = ['cinematic', 'grid', 'stack', 'split'];
export const MAX_PANELS = 8;

export function makePanel(id = newId('panel')) {
  return { id, caption: '', dialogue: '', image: '', imageAlt: '', artworkNote: '' };
}
export function normalizedPanels(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_PANELS).map(p => {
    const item = p && typeof p === 'object' && !Array.isArray(p) ? p : {};
    const safe = (v, limit) => String(v ?? '').slice(0, limit);
    const image = typeof item.image === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(item.image) && item.image.length <= 6000000 ? item.image : '';
    return { id: /^[a-zA-Z0-9_-]{1,80}$/.test(String(item.id || '')) ? item.id : newId('panel'),
      caption: safe(item.caption, 1500), dialogue: safe(item.dialogue, 1000),
      image, imageAlt: safe(item.imageAlt, 220), artworkNote: safe(item.artworkNote, 500) };
  });
}
export function normalizedMapPositions(input, sceneIds) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const ids = new Set(sceneIds);
  const positions = {};
  for (const [id, position] of Object.entries(input).slice(0, 500)) {
    if (!ids.has(id) || !position || typeof position !== 'object') continue;
    const x = Number(position.x), y = Number(position.y);
    if (Number.isFinite(x) && Number.isFinite(y)) positions[id] = { x: Math.max(5,Math.min(4800,x)), y: Math.max(5,Math.min(4800,y)) };
  }
  return positions;
}
const textOnly = (s, max=10000) => String(s ?? '').slice(0,max);
function uniqueIdentifier(label, used) {
  const base = (String(label).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,64)) || 'scene';
  let id = base, n = 2;
  while(used.has(id)) id = base.slice(0,55) + '-' + n++;
  used.add(id); return id;
}
function passages(text) {
  const words = text.trim();
  if (!words) return [];
  const paragraphs = words.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  if (paragraphs.length === 1) return [words];
  const result = []; let group = '';
  for (const p of paragraphs) {
    if (group && group.length + p.length > 1100) { result.push(group); group=''; }
    group += (group ? '\n\n' : '') + p;
  }
  if (group) result.push(group);
  return result;
}
export function prepareManuscript(input) {
  const text = String(input ?? '').replace(/\r\n/g,'\n').trim();
  if (!text) throw new Error('Paste at least one paragraph of your manuscript.');
  if (text.length > 250000) throw new Error('Keep manuscript imports under 250,000 characters. Split larger works into chapters.');
  if (/^::\s*[a-zA-Z0-9_-]+\s*\|/m.test(text)) {
    const result=parseOutline(text);
    return { ...result, mode:'Explicit branching outline', message:'Existing choice destinations were preserved. Check for missing links.' };
  }
  const lines = text.split('\n'), groups = [];
  let current = null;
  function flush() { if (current && current.body.trim()) groups.push(current); current=null; }
  for (const line of lines) {
    const match = line.match(/^\s{0,3}#{1,3}\s+(.+?)\s*$/) || line.match(/^\s*(Chapter\s+\d+\s*[:.\-–]?\s*.*)$/i);
    if (match) { flush(); current = { title: match[1].replace(/#+$/,'').trim().slice(0,120), body:'' }; }
    else {
      if (!current) current={title:'Opening',body:''};
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  flush();
  if (!groups.length) groups.push({title:'Opening',body:text});
  const used=new Set(), scenes=[];
  for (const group of groups.slice(0,100)) {
    const parts=passages(group.body);
    for (let i=0;i<parts.length;i++) {
      if(scenes.length>=100) throw new Error('Import exceeds 100 scenes. Split the manuscript into smaller parts.');
      const name = parts.length === 1 ? group.title : group.title+' · '+(i+1);
      const s=scene(uniqueIdentifier(name,used));
      s.title=textOnly(name,120); s.narration=textOnly(parts[i],10000);
      scenes.push(s);
    }
  }
  for(let i=0;i<scenes.length-1;i++) scenes[i].choices=[{id:newId('choice'),text:'Turn the page',to:scenes[i+1].id,condition:null,effect:null}];
  scenes[scenes.length-1].ending=true;
  return { scenes,start:scenes[0].id,mode:'Linear manuscript',message:'Pages are connected linearly for now. Add choices in the studio where the story should branch.' };
}
export function appendScenes(existing, incoming) {
  if (!Array.isArray(incoming) || !incoming.length) throw new Error('No scenes were found to append.');
  if(existing.scenes.length+incoming.length>500) throw new Error('Maximum 500 scenes per book.');
  const used=new Set(existing.scenes.map(s=>s.id)), remap=new Map();
  for(const s of incoming) remap.set(s.id, uniqueIdentifier(s.id,used));
  const copied=incoming.map(s=>({...s,id:remap.get(s.id),choices:s.choices.map(c=>({...c,id:newId('choice'),to:remap.get(c.to)||c.to}))}));
  return {...existing,scenes:[...existing.scenes,...copied]};
}
export function layoutStory(story) {
  const ids=new Set(story.scenes.map(s=>s.id)), distances=new Map([[story.start,0]]), queue=[story.start];
  while(queue.length) {
    const id=queue.shift(); const level=distances.get(id);
    const item=story.scenes.find(s=>s.id===id);
    for(const c of item?.choices||[]) if(ids.has(c.to)&&!distances.has(c.to)) { distances.set(c.to,level+1); queue.push(c.to); }
  }
  let max=0;for(const d of distances.values()) max=Math.max(d,max);
  for(const item of story.scenes) if(!distances.has(item.id)) distances.set(item.id,++max);
  const rows=new Map();
  for(const s of story.scenes) {
    const depth=distances.get(s.id);
    if(!rows.has(depth)) rows.set(depth,[]);
    rows.get(depth).push(s.id);
  }
  const positions={};
  for(const [depth, row] of rows) row.forEach((id,index)=> {
    positions[id]={x:70+index*250,y:70+depth*140};
  });
  return positions;
}
