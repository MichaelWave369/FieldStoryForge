export const ART_PRESETS = Object.freeze([
  'Graphic novel ink', 'Watercolor storybook', 'Painterly fantasy', 'Retro pulp comic',
  'Cel-shaded animation', 'Noir illustration', 'Woodcut folklore', 'Custom'
]);
const trim = (v, n=500) => String(v ?? '').slice(0,n);
const idOk = v => typeof v==='string' && /^[A-Za-z0-9_-]{1,80}$/.test(v);
const imageOk = v => typeof v==='string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(v) && v.length < 6000000;
export const blankStyle = () => ({preset:'Painterly fantasy',custom:'',palette:'',mood:'',avoid:'',aspect:'3:4'});
export function normalizeStyle(s) {
  const d=blankStyle(), v=s && typeof s==='object' && !Array.isArray(s)?s:{};
  return {preset:ART_PRESETS.includes(v.preset)?v.preset:d.preset,
    custom:trim(v.custom,180),palette:trim(v.palette,240),mood:trim(v.mood,240),
    avoid:trim(v.avoid,700),aspect:['1:1','3:4','4:3','16:9','9:16'].includes(v.aspect)?v.aspect:d.aspect};
}
export const blankPlan = () => ({characterIds:[],locationId:'',composition:'',lighting:''});
export function normalizePlan(p, castIds=[], locationIds=[]) {
  const v=p && typeof p==='object' && !Array.isArray(p)?p:{}, known=new Set(castIds), places=new Set(locationIds);
  return {characterIds:Array.isArray(v.characterIds)?[...new Set(v.characterIds.filter(x=>idOk(x)&&known.has(x)))].slice(0,12):[],
    locationId:places.has(v.locationId)?v.locationId:'',
    composition:trim(v.composition,500),lighting:trim(v.lighting,240)};
}
export function normalizeArtMeta(m) {
  const v=m && typeof m==='object' && !Array.isArray(m)?m:{};
  return {source:['uploaded','external-tool','hand-drawn','other'].includes(v.source)?v.source:'uploaded',
    prompt:trim(v.prompt,4000),negativePrompt:trim(v.negativePrompt,1000),
    approvedAt:/^\d{4}-\d{2}-\d{2}T/.test(String(v.approvedAt||''))?trim(v.approvedAt,40):''};
}
export function normalizeCharacterExtras(c) {
  return {appearance:trim(c?.appearance,900),wardrobe:trim(c?.wardrobe,500),
    signature:trim(c?.signature,500),continuityNotes:trim(c?.continuityNotes,700)};
}
export function normalizeLocations(source) {
  if(!Array.isArray(source))return [];
  return source.slice(0,50).map((x,i)=>({
    id:idOk(x?.id)?x.id:'location-'+i,
    name:trim(x?.name,90),description:trim(x?.description,700),
    definingDetails:trim(x?.definingDetails,700),
    image:imageOk(x?.image)?x.image:''
  }));
}
export function composeArtBrief(story, sceneId, panelId='') {
  const page=story.scenes.find(s=>s.id===sceneId);
  if(!page)throw new Error('Choose an existing scene.');
  const panel=panelId? (page.panels||[]).find(p=>p.id===panelId):null;
  if(panelId&&!panel)throw new Error('Panel no longer exists.');
  const item=panel||page,style=normalizeStyle(story.artStyle);
  const cast=story.characters||[],places=story.locations||[];
  const plan=normalizePlan(item.artPlan,cast.map(c=>c.id),places.map(l=>l.id));
  const selected=plan.characterIds.map(id=>cast.find(c=>c.id===id)).filter(Boolean);
  const location=places.find(l=>l.id===plan.locationId);
  const segments=[
    'Illustrate an original comic-book panel for "'+trim(story.title,120)+'".',
    'Style: '+(style.preset==='Custom'?(style.custom||'original illustration'):style.preset)+'.',
    style.palette?'Consistent color palette: '+style.palette+'.':'',
    style.mood?'Mood and texture: '+style.mood+'.':'',
    'Scene: '+trim(page.title,120)+'.',
    item.artworkNote?'Visual direction: '+trim(item.artworkNote,500)+'.':(page.narration?'Scene context: '+trim(page.narration,450)+'.':''),
    plan.composition?'Composition: '+plan.composition+'.':'',
    plan.lighting?'Lighting: '+plan.lighting+'.':'',
    location?'Location continuity: '+location.name+'. '+location.description+'. Anchors: '+location.definingDetails+'.':'',
    ...selected.map(c=>'Character continuity: '+c.name+'. '+(c.appearance||c.description||'')+'. Wardrobe: '+(c.wardrobe||'not specified')+'. Distinguishing features: '+(c.signature||'not specified')+'. Keep consistent: '+(c.continuityNotes||'follow character reference')+'.'),
    'Keep character identity, costumes, environmental anchors, and palette consistent with approved reference artwork.',
    'Do not add comic lettering or speech bubbles to the illustration; the reader overlays dialogue separately.',
    'Target aspect ratio: '+style.aspect+'.'
  ];
  const negative=['unwanted lettering, watermarks, illegible text, inconsistent character appearance',
    style.avoid,...selected.map(c=>c.continuityNotes?'Avoid contradicting '+c.name+' continuity details.':'')].filter(Boolean).join('; ');
  const warnings=[
    ...selected.filter(c=>!(c.appearance||c.description)).map(c=>c.name+' needs an appearance description.'),
    ...selected.filter(c=>!c.image).map(c=>c.name+' has no reference portrait attached.'),
    ...(!plan.characterIds.length?['No characters assigned to this shot; select cast members if visible.']:[]),
    ...(location&&!location.definingDetails?['The location needs fixed visual anchors.']:[])
  ];
  return {version:1,storyId:story.id,sceneId,panelId:panel?.id||'',sceneTitle:page.title,panelLabel:panel?.caption||'Scene cover',
    aspect:style.aspect,characterIds:plan.characterIds,locationId:plan.locationId,
    prompt:segments.filter(Boolean).join('\n'),negativePrompt:negative,warnings};
}
export function createPromptPack(story) {
  const shots=story.scenes.flatMap(s=>(s.panels||[]).length
    ?s.panels.map(p=>composeArtBrief(story,s.id,p.id))
    :[composeArtBrief(story,s.id)]);
  return {format:'fieldstory-art-brief/v1',storyId:story.id,title:story.title,
    note:'Prompts only. Contains author-supplied character and location descriptions. No images, reference portraits, or API keys. Author approval required before adding artwork.',
    style:normalizeStyle(story.artStyle),
    characters:(story.characters||[]).map(c=>({id:c.id,name:c.name,appearance:c.appearance||c.description,wardrobe:c.wardrobe,signature:c.signature,continuityNotes:c.continuityNotes})),
    locations:(story.locations||[]).map(l=>({id:l.id,name:l.name,description:l.description,definingDetails:l.definingDetails})),shots};
}
export function artReferenceWarnings(story) {
  const findings=[];
  const cast=new Set((story.characters||[]).map(x=>x.id));
  const places=new Set((story.locations||[]).map(x=>x.id));
  for(const page of story.scenes||[]) for(const shot of (page.panels?.length?page.panels:[page])) {
    const name=page.title+(shot===page?'':': panel '+((page.panels||[]).indexOf(shot)+1));
    for(const id of shot.artPlan?.characterIds||[]) if(!cast.has(id))findings.push(name+' references a missing character '+id);
    if(shot.artPlan?.locationId&&!places.has(shot.artPlan.locationId))findings.push(name+' references a missing location '+shot.artPlan.locationId);
  }
  return findings;
}
