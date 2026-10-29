import { PANEL_LAYOUTS, normalizedPanels, normalizedMapPositions } from './rung2.js';
export const FORMAT = 'fieldstory/v1';
export const MAX_FILE_CHARS = 8_000_000;
const cleanText = (value, max = 10000) => String(value ?? '').slice(0, max);
const safeId = value => /^[a-zA-Z0-9_-]{1,80}$/.test(String(value || ''));
const safeImage = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value) && value.length < 6_000_000 ? value : '';

export function newId(prefix = 'scene') {
  if (typeof globalThis.crypto?.randomUUID === 'function') return prefix + '-' + globalThis.crypto.randomUUID().slice(0, 12);
  return prefix + '-' + Math.random().toString(36).slice(2, 12);
}
export function scene(id = newId()) {
  return { id, title: 'Untitled scene', narration: '', dialogue: '', image: '', imageAlt: '', artworkNote: '', ending: false, choices: [], layout: 'cinematic', panels: [] };
}
export function createStory() {
  const first = scene('opening');
  first.title = 'Once upon a time';
  first.narration = 'Every adventure begins somewhere.';
  return { format: FORMAT, id: newId('story'), title: 'Untitled Living Comic', author: '', description: '', genre: 'Fantasy', start: first.id, scenes: [first], characters: [], mapPositions: {}, updatedAt: new Date().toISOString() };
}
export function normalizeStory(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source) || source.format !== FORMAT) throw new Error('Not a supported .fieldstory/v1 file.');
  if (!Array.isArray(source.scenes) || source.scenes.length === 0 || source.scenes.length > 500) throw new Error('Stories must contain 1 to 500 scenes.');
  let totalChoices = 0;
  const scenes = source.scenes.map((item, index) => {
    if (!item || !safeId(item.id)) throw new Error('Invalid scene ID at position ' + (index + 1) + '.');
    if (!Array.isArray(item.choices) || item.choices.length > 12) throw new Error('Each scene may have up to 12 choices.');
    totalChoices += item.choices.length;
    return {
      id: item.id, title: cleanText(item.title, 120), narration: cleanText(item.narration, 10000),
      dialogue: cleanText(item.dialogue, 3000), image: safeImage(item.image), imageAlt: cleanText(item.imageAlt, 220),
      artworkNote: cleanText(item.artworkNote, 500), ending: item.ending === true,
      layout: PANEL_LAYOUTS.includes(item.layout) ? item.layout : 'cinematic', panels: normalizedPanels(item.panels),
      choices: item.choices.map(c => ({
        id: safeId(c.id) ? c.id : newId('choice'),
        text: cleanText(c.text, 160), to: cleanText(c.to, 80),
        condition: c.condition && safeId(c.condition.flag) ? { flag: c.condition.flag, equals: cleanText(c.condition.equals, 80) } : null,
        effect: c.effect && safeId(c.effect.flag) ? { flag: c.effect.flag, value: cleanText(c.effect.value, 80) } : null
      }))
    };
  });
  if (totalChoices > 3000) throw new Error('Story is too large.');
  if (!safeId(source.start)) throw new Error('Invalid starting scene.');
  const characters = Array.isArray(source.characters) ? source.characters.slice(0, 50).map(c => ({
    id: safeId(c?.id) ? c.id : newId('character'), name: cleanText(c?.name, 80),
    description: cleanText(c?.description, 1000), image: safeImage(c?.image)
  })) : [];
  return {
    format: FORMAT, id: safeId(source.id) ? source.id : newId('story'),
    title: cleanText(source.title, 120) || 'Untitled Living Comic', author: cleanText(source.author, 120),
    description: cleanText(source.description, 1000), genre: cleanText(source.genre, 70),
    start: source.start, scenes, characters, mapPositions: normalizedMapPositions(source.mapPositions, scenes.map(s=>s.id)), updatedAt: typeof source.updatedAt === 'string' ? cleanText(source.updatedAt, 40) : ''
  };
}
export function validateStory(story) {
  const errors = [], warnings = [];
  const ids = new Set();
  for (const item of story.scenes || []) {
    if (ids.has(item.id)) errors.push('Duplicate scene ID: ' + item.id);
    ids.add(item.id);
  }
  if (!ids.has(story.start)) errors.push('The starting scene does not exist.');
  for (const item of story.scenes || []) {
    const panelIds = new Set();
    for (const p of item.panels || []) {
      if (panelIds.has(p.id)) errors.push(item.title + ': duplicate comic panel ID.');
      panelIds.add(p.id);
    }
    if (item.ending && item.choices.length) errors.push(item.title + ': ending pages cannot have choices.');
    if (!item.ending && !item.choices.length) warnings.push(item.title + ': dead end without an ending.');
    const choiceIds = new Set();
    for (const choice of item.choices) {
      if (choiceIds.has(choice.id)) errors.push(item.title + ': duplicate choice ID.');
      choiceIds.add(choice.id);
      if (!ids.has(choice.to)) errors.push(item.title + ': choice "' + choice.text + '" has no destination.');
      if (!choice.text.trim()) warnings.push(item.title + ': blank choice label.');
    }
  }
  const visited = new Set(), todo = [story.start];
  while (todo.length) {
    const id = todo.pop();
    if (visited.has(id) || !ids.has(id)) continue;
    visited.add(id);
    const page = story.scenes.find(s => s.id === id);
    for (const c of page?.choices || []) todo.push(c.to);
  }
  for (const s of story.scenes || []) if (!visited.has(s.id)) warnings.push('Unreachable scene: ' + s.title);
  if (![...(story.scenes || [])].some(s => s.ending)) warnings.push('No ending is marked.');
  return { errors, warnings };
}
export function availableChoices(page, flags = {}) {
  return (page?.choices || []).filter(c => !c.condition || String(flags[c.condition.flag] ?? '') === String(c.condition.equals));
}
export function startReading(story) { return { sceneId: story.start, flags: {}, history: [] }; }
export function takeChoice(story, reading, choiceId) {
  const page = story.scenes.find(s => s.id === reading.sceneId);
  const choice = availableChoices(page, reading.flags).find(c => c.id === choiceId);
  if (!choice || page?.ending || !story.scenes.some(s => s.id === choice.to)) return reading;
  const flags = { ...reading.flags };
  if (choice.effect) flags[choice.effect.flag] = choice.effect.value;
  return {
    sceneId: choice.to, flags,
    history: [...reading.history.slice(-199), { sceneId: reading.sceneId, flags: { ...reading.flags } }]
  };
}
export function goBack(reading) {
  if (!reading.history?.length) return reading;
  const previous = reading.history[reading.history.length - 1];
  return { sceneId: previous.sceneId, flags: { ...previous.flags }, history: reading.history.slice(0, -1) };
}
export function parseOutline(text) {
  const blocks = String(text).split(/^::\s*/m).map(x => x.trim()).filter(Boolean);
  if (!blocks.length || blocks.length > 100) throw new Error('Use :: scene-id | Scene title to begin each scene (maximum 100).');
  const scenes = blocks.map((block, index) => {
    const lines = block.split(/\r?\n/);
    const parts = lines.shift().split('|');
    const id = parts[0].trim(), title = (parts[1] || id).trim();
    if (!safeId(id)) throw new Error('Invalid scene ID "' + id + '" in scene ' + (index + 1) + '.');
    const item = scene(id);
    item.title = title;
    const narration = [];
    for (const line of lines) {
      if (line.startsWith('?')) {
        const match = line.match(/^\?\s*(.+?)\s*->\s*([a-zA-Z0-9_-]+)\s*$/);
        if (!match) throw new Error('Invalid choice line: ' + line);
        item.choices.push({ id: newId('choice'), text: match[1], to: match[2], condition: null, effect: null });
      } else if (line.trim() === '! ending') item.ending = true;
      else narration.push(line);
    }
    item.narration = narration.join('\n').trim();
    return item;
  });
  return { scenes, start: scenes[0].id };
}
export function demoStory() {
  const s = (id, title, narration, choices = [], ending = false, artworkNote = '') => ({
    id, title, narration, dialogue: '', image: '', imageAlt: '', artworkNote, ending,
    artPlan: id==='attic' ? {characterIds:['mara'],locationId:'old-attic',composition:'Wide view down the attic toward a brass door',lighting:'Silver moonlight entering the circular window'} : null,
    choices: choices.map((c, i) => ({ id: id + '-choice-' + i, text: c[0], to: c[1],
      condition: c[2] ? { flag: c[2][0], equals: c[2][1] } : null,
      effect: c[3] ? { flag: c[3][0], value: c[3][1] } : null }))
  });
  return normalizeStory({
    format: FORMAT, id: 'whispering-door', title: 'The Whispering Door', author: 'FieldStoryForge',
    description: 'One locked attic door. Three endings. Your choices leave traces.',
    genre: 'Gothic Fantasy', start: 'attic',
    artStyle: {preset:'Painterly fantasy',palette:'Moonlit violet, tarnished copper, candlelit gold',mood:'Moody storybook watercolor with intricate ink details',avoid:'Modern billboards or neon signage',aspect:'3:4'},
    characters: [{ id: 'mara', name: 'Mara', description: 'A curious archivist returning to her grandmother’s old house.', appearance:'Adult woman with wavy dark hair, dark eyebrows, and a thoughtful expression',wardrobe:'Indigo wool coat and a tan leather satchel',signature:'Small brass key pendant',continuityNotes:'Keep her dark wavy hair, indigo coat and key pendant consistent between scenes' }],
    locations: [{id:'old-attic',name:'Grandmother’s attic',description:'An old attic above a rural house, heavy with dust and memories',definingDetails:'Exposed rafters, single circular window, a dark brass door framed by faded floral wallpaper'}],
    scenes: [
      s('attic', 'The Last Stair', 'The attic smells of rain and forgotten paper. At its far end stands a door no one remembers building. A voice whispers your name.', [['Open the door', 'threshold'], ['Search the attic first', 'trunk'], ['Call out to the voice', 'answer']], false, 'A dusty attic, lone brass door, moonlight through rafters.'),
      s('trunk', 'The Cedar Trunk', 'Inside a cedar trunk you find a silver key and a letter in your grandmother’s handwriting: “Not every door leads away.”', [['Take the key and approach the door', 'threshold', null, ['key', 'yes']], ['Leave the key untouched', 'answer']], false, 'Close-up of an antique silver key.'),
      s('answer', 'A Familiar Voice', '“You have been here before,” the voice says. A floorboard creaks behind you. You are no longer alone.', [['Turn around', 'visitor'], ['Rush through the door', 'threshold']], false, 'Long shadows stretching across the attic.'),
      s('visitor', 'The Second Visitor', 'A child in a yellow coat watches you with strangely familiar eyes. “She asked me to keep you safe,” the child says.', [['Trust the child', 'sanctuary', null, ['trust', 'yes']], ['Follow the knocking instead', 'hall']], false, 'A small figure in yellow at the top of the stairs.'),
      s('threshold', 'The Threshold', 'The brass handle is warm. Beyond the door: a forest lit by two pale moons. Something waits between the trees.', [['Step into the forest', 'forest'], ['Try your silver key', 'hidden', ['key', 'yes']], ['Close the door and listen', 'hall']], false, 'A glowing doorway opening into a violet forest.'),
      s('hidden', 'The Secret Lock', 'The key turns in a lock that was invisible a moment ago. A second doorway opens, revealing an old observatory.', [['Enter the observatory', 'observatory'], ['Go back toward the forest', 'forest']], false, 'An ivy-covered spiral staircase beneath starlight.'),
      s('forest', 'Beneath Two Moons', 'Fireflies gather into the shape of a compass. A river runs uphill, carrying scraps of old letters.', [['Follow the fireflies', 'lantern'], ['Cross the impossible river', 'river']], false, 'A magical forest with two moons.'),
      s('lantern', 'The Lantern Keeper', 'A hooded keeper offers you a lantern. “The truth is easier to hold when it gives you something to carry.”', [['Accept the lantern', 'sanctuary', null, ['light', 'yes']], ['Ask for the way home', 'home']], false, 'An amber lantern illuminating violet mist.'),
      s('river', 'The River of Letters', 'As you step into the water, the letters unfold into memories. You see your grandmother leaving this place, once, for your sake.', [['Read the final letter', 'truth'], ['Let the river carry you', 'lost']], false, 'Glowing pages floating in a moonlit river.'),
      s('observatory', 'The Star Atlas', 'The ceiling holds a chart of every choice you never made. One constellation is shaped exactly like your hand.', [['Touch the constellation', 'truth'], ['Seal the observatory and return home', 'home']], false, 'A cosmic observatory filled with moving star charts.'),
      s('hall', 'The Hall Between Hours', 'The hallway stretches far beyond the house. Every mirror reflects a different version of you.', [['Choose the mirror with morning light', 'home'], ['Walk toward the darkest reflection', 'lost']], false, 'A corridor of antique mirrors.'),
      s('sanctuary', 'The Garden of Names', 'You reach a quiet garden. The flowers whisper names of people who were loved and never forgotten.', [['Stay and guard the garden', 'guardian'], ['Return with the story', 'home']], false, 'A peaceful garden of luminous flowers.'),
      s('truth', 'The Last Letter', '“There was no curse,” the letter reads. “Only a promise. I left the door for you when you were ready to choose.”', [['Return carrying the truth', 'home'], ['Become the next keeper', 'guardian']], false, 'A letter shining in starlight.'),
      s('home', 'Ending: The Way Home', 'At dawn, the attic door is only a door. Yet in your pocket sits something impossible: a map to a place that remembers you.', [], true, 'Sunrise through the attic window.'),
      s('guardian', 'Ending: The Keeper', 'You hang the lantern on an ancient branch. Somewhere, a new voice hears its name. You smile and answer gently.', [], true, 'A guardian among golden lanterns.'),
      s('lost', 'Ending: The Unwritten Path', 'The river folds into darkness and the mirrors fall silent. Your story is not over, but its next page belongs to another world.', [], true, 'A silhouette disappearing into a cosmic horizon.')
    ]
  });
}
