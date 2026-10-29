# FieldStoryForge Roadmap

## Rung 1 · Playable living comic (this PR)
Local-first React editor, portable story graph and branching reader, original demo adventure, character notebook, uploaded images, strict import/export, offline HTML edition, unit/e2e tests.

## Rung 2 · Production comic studio
Per-scene multi-panel layouts; drag-and-drop panel editing; speech-bubble placement; visual story graph; cover art designer; undo/redo; non-destructive text/Markdown import; explicit asset compression and storage quota management.

## Rung 3 · Assisted creativity
Opt-in image and writing providers (local or cloud), character reference system, generated illustration review, prompt/version provenance, explicit approval before any AI changes. Manual mode remains fully functional.

## Rung 4 · Bridges
Versioned adapters to FieldAtlas reader, PixelForge narrative export, Domistika assets, and PhiOS local packaging; never require other products or unverified network services. Separate ownership of user-generated stories.

## Rung 5 · Immersive living worlds
Optional voices, soundscapes, animation, WebXR passages, rich accessibility and subtitles. No automatic transformation of authored content without author consent.

## Release gates
- Green CI build and unit tests
- Playwright smoke tests for demo play and authoring
- Manual mobile/keyboard/accessibility acceptance
- Portable offline HTML opened independently
- No broken links, missing scene IDs, or false capability claims
