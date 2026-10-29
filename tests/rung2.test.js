import test from 'node:test';
import assert from 'node:assert/strict';
import { createStory, normalizeStory, validateStory, scene, demoStory } from '../src/story.js';
import { makePanel, normalizedPanels, normalizedMapPositions, prepareManuscript, appendScenes, layoutStory } from '../src/rung2.js';
import { buildStandaloneHtml } from '../src/standalone.js';

test('legacy books remain readable and normalize optional comic panels',()=>{
  const story=createStory(); delete story.scenes[0].panels; delete story.scenes[0].layout;
  const imported=normalizeStory(story);
  assert.deepEqual(imported.scenes[0].panels,[]);
  assert.equal(imported.scenes[0].layout,'cinematic');
});
test('comic panels round-trip without unsafe or remote media',()=>{
  const story=createStory(); const p=makePanel('panel-a');
  p.caption='Three nights passed.';
  p.dialogue='“It is time.”';
  p.image='javascript:alert(1)';
  story.scenes[0].panels=[p];
  story.scenes[0].layout='grid';
  const imported=normalizeStory(JSON.parse(JSON.stringify(story)));
  assert.equal(imported.scenes[0].panels[0].caption,p.caption);
  assert.equal(imported.scenes[0].panels[0].image,'');
  assert.equal(imported.scenes[0].layout,'grid');
  assert.deepEqual(validateStory(imported).errors,[]);
});
test('panel normalizer enforces limit and strictly strips HTML and remote URLs',()=>{
  const raw=Array.from({length:12},(_,i)=>({...makePanel('panel-'+i),image:'https://example.com/tracker.png'}));
  assert.equal(normalizedPanels(raw).length,8);
  assert.equal(normalizedPanels(raw)[0].image,'');
});
test('manuscript headings create linear, non-destructive scenes',()=>{
  const result=prepareManuscript('# The Letter\n\nA letter arrives.\n\n# The Road\n\nShe follows the road.');
  assert.equal(result.mode,'Linear manuscript');
  assert.equal(result.scenes.length,2);
  assert.equal(result.scenes[0].choices[0].to,result.scenes[1].id);
  assert.equal(result.scenes[1].ending,true);
  assert.match(result.scenes[0].narration,/A letter arrives/);
});
test('explicit branching outline retains choices',()=>{
  const result=prepareManuscript(':: opening | Opening\nThe key shines.\n? Unlock -> ending\n\n:: ending | Ending\nHome again.\n! ending');
  assert.equal(result.mode,'Explicit branching outline');
  assert.equal(result.scenes[0].choices[0].to,'ending');
});
test('append remaps conflicting scene IDs and internal destinations',()=>{
  const original=createStory();
  const a=scene('opening'),b=scene('the-end');b.ending=true;
  a.choices=[{id:'link',text:'Finish',to:'the-end',condition:null,effect:null}];
  const combined=appendScenes(original,[a,b]);
  assert.equal(combined.scenes.length,3);
  assert.notEqual(combined.scenes[1].id,'opening');
  assert.equal(combined.scenes[1].choices[0].to,combined.scenes[2].id);
  assert.equal(combined.start,original.start);
});
test('map positions survive import and reject invalid coordinates',()=>{
  const s=demoStory(),map=layoutStory(s);
  assert.ok(map.attic);
  s.mapPositions={attic:{x:270,y:310},forest:{x:-15,y:99999},ghost:{x:1,y:1}};
  const imported=normalizeStory(s);
  assert.deepEqual(imported.mapPositions.attic,{x:270,y:310});
  assert.equal(imported.mapPositions.forest.x,5);
  assert.equal(imported.mapPositions.forest.y,4800);
  assert.equal(imported.mapPositions.ghost,undefined);
});
test('standalone HTML includes multi-panel art, captions, and dialogue',()=>{
  const s=demoStory(),p=makePanel('panel-a');
  p.caption='A whisper in the trees';p.dialogue='“Who are you?”';
  s.scenes[0].panels=[p];s.scenes[0].layout='grid';
  const html=buildStandaloneHtml(s);
  assert.match(html,/panel-caption/);
  assert.match(html,/A whisper in the trees/);
  assert.match(html,/Who are you/);
  assert.match(html,/layout-grid/);
  assert.ok(!html.includes('<script src="https://'));
});
