import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT, createStory, demoStory, normalizeStory, parseOutline, startReading, takeChoice, goBack, validateStory, availableChoices } from '../src/story.js';
import { buildStandaloneHtml } from '../src/standalone.js';

test('demo ships with branching paths and three unique endings', () => {
  const s = demoStory();
  assert.equal(s.format, FORMAT);
  assert.ok(s.scenes.length >= 10);
  assert.equal(s.scenes.filter(p => p.ending).length, 3);
  assert.deepEqual(validateStory(s).errors, []);
});
test('hidden choice becomes available only with key and back restores flags', () => {
  const s = demoStory();
  let r = startReading(s);
  r = takeChoice(s,r,'attic-choice-1');
  r = takeChoice(s,r,'trunk-choice-0');
  const threshold = s.scenes.find(x => x.id === r.sceneId);
  assert.equal(r.flags.key,'yes');
  assert.ok(availableChoices(threshold,r.flags).some(c=>c.to==='hidden'));
  assert.ok(!availableChoices(threshold,{}).map(c=>c.to).includes('hidden'));
  r = goBack(r);
  assert.equal(r.sceneId,'trunk');
  assert.deepEqual(r.flags,{});
});
test('invalid or unavailable choices cannot force travel', () => {
  const s=demoStory(), r=startReading(s);
  assert.equal(takeChoice(s,r,'does-not-exist'),r);
  const threshold={sceneId:'threshold',flags:{},history:[]};
  assert.equal(takeChoice(s,threshold,'threshold-choice-1'),threshold);
});
test('graph validation detects missing choices and unreachable scenes', () => {
  const s=createStory();
  s.scenes[0].choices=[{id:'x',text:'Wrong',to:'missing',condition:null,effect:null}];
  const result=validateStory(s);
  assert.ok(result.errors.some(x=>x.includes('no destination')));
  assert.ok(result.warnings.some(x=>x.includes('No ending')));
});
test('outline importer parses narrative and choices', () => {
  const parsed=parseOutline(':: beginning | Start\nA curious scene.\n? Try it -> finale\n\n:: finale | End\nDone.\n! ending');
  assert.equal(parsed.start,'beginning');
  assert.equal(parsed.scenes[0].choices[0].to,'finale');
  assert.equal(parsed.scenes[1].ending,true);
  const normalized=normalizeStory({...createStory(),scenes:parsed.scenes,start:parsed.start});
  assert.deepEqual(validateStory(normalized).errors,[]);
});
test('story export/import preserves content and strips untrusted images', () => {
  const s=demoStory();
  s.scenes[0].image='javascript:alert(1)';
  const copy=normalizeStory(JSON.parse(JSON.stringify(s)));
  assert.equal(copy.scenes[0].image,'');
  assert.equal(copy.scenes[0].narration,s.scenes[0].narration);
  assert.throws(()=>normalizeStory({format:'other',scenes:[{}]}));
});
test('standalone reader embeds a portable story, not external dependencies', () => {
  const html=buildStandaloneHtml(demoStory());
  assert.match(html, /<!doctype html>/);
  assert.match(html, /The Whispering Door/);
  assert.match(html, /standaloneRuntime/);
  assert.ok(!html.includes('src="https://'));
});
test('standalone title and text cannot break out of script or HTML', () => {
  const s=demoStory();
  s.title='</title><script>alert(1)</script>';
  s.scenes[0].narration='</script><script>alert(2)</script>';
  const html=buildStandaloneHtml(s);
  assert.ok(!html.includes('</title><script>alert(1)</script>'));
  assert.ok(!html.includes('</script><script>alert(2)</script>'));
});
