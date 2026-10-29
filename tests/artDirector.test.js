import test from 'node:test';
import assert from 'node:assert/strict';
import {createStory, normalizeStory, demoStory} from '../src/story.js';
import {composeArtBrief, createPromptPack, normalizePlan, normalizeStyle, normalizeLocations, normalizeArtMeta} from '../src/artDirector.js';
import {makePanel} from '../src/rung2.js';
import {buildStandaloneHtml} from '../src/standalone.js';

test('legacy stories acquire optional art style, character and location fields',()=>{
 const s=createStory();
 delete s.artStyle;delete s.locations;
 const upgraded=normalizeStory(s);
 assert.equal(upgraded.artStyle.preset,'Painterly fantasy');
 assert.deepEqual(upgraded.locations,[]);
 assert.deepEqual(upgraded.scenes[0].artPlan,{characterIds:[],locationId:'',composition:'',lighting:''});
});
test('demo identity and location anchors are included in reusable shot prompt',()=>{
 const s=demoStory(),brief=composeArtBrief(s,'attic');
 assert.match(brief.prompt,/Mara/);
 assert.match(brief.prompt,/wavy dark hair/);
 assert.match(brief.prompt,/indigo wool coat/i);
 assert.match(brief.prompt,/circular window/);
 assert.match(brief.prompt,/Moonlit violet/);
 assert.match(brief.negativePrompt,/neon signage/);
 assert.deepEqual(brief.characterIds,['mara']);
 assert.equal(brief.locationId,'old-attic');
});
test('panel-specific direction and cast selection override classic cover',()=>{
 const s=demoStory(),p=makePanel('shot-1');
 p.artworkNote='Wide angle of a silver staircase';
 p.artPlan={characterIds:['mara'],locationId:'old-attic',composition:'Extreme wide shot',lighting:'Blue candlelight'};
 s.scenes[0].panels=[p];
 const normalized=normalizeStory(s);
 const b=composeArtBrief(normalized,'attic','shot-1');
 assert.equal(b.panelId,'shot-1');
 assert.match(b.prompt,/Extreme wide shot/);
 assert.match(b.prompt,/silver staircase/);
 assert.match(b.prompt,/Blue candlelight/);
 assert.throws(()=>composeArtBrief(normalized,'attic','not-there'),/Panel no longer exists/);
});
test('invalid identity links are removed from art plans, preserving valid IDs',()=>{
 const p=normalizePlan({characterIds:['mara','mara','missing'],locationId:'nowhere',composition:'hi'},['mara'],['old-attic']);
 assert.deepEqual(p.characterIds,['mara']);
 assert.equal(p.locationId,'');
 const s=demoStory();s.scenes[0].artPlan.characterIds=['missing','mara'];
 assert.deepEqual(normalizeStory(s).scenes[0].artPlan.characterIds,['mara']);
});
test('art metadata has bounded provenance and never allows arbitrary media URLs',()=>{
 const s=demoStory(),p=makePanel('approved');
 p.image='https://remote.example/spy.png';
 p.artMeta={source:'external-tool',prompt:'repeat the character',negativePrompt:'avoid logos',approvedAt:'2026-10-29T19:00:00.000Z'};
 s.scenes[0].panels=[p];
 const safe=normalizeStory(s);
 assert.equal(safe.scenes[0].panels[0].image,'');
 assert.equal(safe.scenes[0].panels[0].artMeta.source,'external-tool');
 assert.match(safe.scenes[0].panels[0].artMeta.prompt,/repeat the character/);
 assert.equal(normalizeArtMeta({source:'unknown',approvedAt:'tomorrow'}).approvedAt,'');
 assert.equal(normalizeStyle({preset:'untrusted'}).preset,'Painterly fantasy');
 assert.equal(normalizeLocations([{id:'cave',name:'Cave',image:'javascript:bad'}])[0].image,'');
});
test('prompt packs contain all scenes and avoid embedding artwork images',()=>{
 const s=demoStory();s.characters[0].image='data:image/png;base64,AAAA';
 const pack=createPromptPack(s);
 assert.equal(pack.format,'fieldstory-art-brief/v1');
 assert.equal(pack.shots.length,s.scenes.length);
 assert.equal(JSON.stringify(pack).includes('data:image'),false);
 assert.equal(pack.shots.some(x=>x.characterIds.includes('mara')),true);
 assert.ok(pack.shots.every(x=>x.prompt.includes('Target aspect ratio')));
});
test('standalone export contains approved illustration but no editing only prompt pack',()=>{
 const s=demoStory();s.scenes[0].artMeta={source:'hand-drawn',prompt:'Mara in the attic',approvedAt:'2026-10-29T19:00:00Z'};
 const html=buildStandaloneHtml(s);
 assert.match(html,/The Whispering Door/);
 assert.match(html,/Mara in the attic/);
 assert.ok(!html.includes('fieldstory-art-brief/v1'));
});
