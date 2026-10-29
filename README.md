# ✦ FieldStoryForge

**The Living Comic Studio · Φ369 Labs**

A free, local-first tool for turning original stories into illustrated interactive comic books where every choice opens a different page.

> The storyteller owns the imagination. FieldStoryForge provides the tools to bring it to life.

## Rung 2: comic composer and manuscript workflow

- **Multi-panel comic pages:** up to 8 illustrated panels per scene, with narration captions, speech bubbles, image descriptions, upload/reordering, and cinematic/grid/stack/split layouts. The reader and standalone offline HTML export both render these panels.
- **Manuscript importer:** paste text or open a .txt/.md; Markdown headings and chapter headings become scenes, and plain manuscript sections become linear pages that you can turn into branches. Existing explicit `:: id | Title` and `? choice -> id` markup retains linked branches. An import preview and append-by-default prevent accidental overwrites.
- **Visual story map:** draggable scene arrangement, click-to-connect canonical choice edges, and a text-based connection list for accessibility. All links are still checked by the existing graph validator.
- **Undo/redo:** 40 steps per story during the current editor session, including page editing, imports and map changes. Use the Studio buttons for whole-story undo.
- **Backward-compatible format:** older fieldstory/v1 books remain readable. `panels`, `layout`, and `mapPositions` are optional additions.

No AI image generation, automatic understanding of arbitrary story branching, or live cross-product integration is claimed. Avoid large embedded images; browser localStorage has limited capacity. The `.fieldstory` and offline HTML exports are your portable backups.

## Rung 1 features

- **Bookshelf:** create, edit, duplicate, import, delete, and read multiple stories.
- **Comic studio:** edit scenes, narration, dialogue, artwork, descriptions, and branching choices.
- **Narrative engine:** conditions, persistent choice flags, multiple endings, backtracking with state restoration, restart, and browser-local resume.
- **Story map:** connection overview, broken-link checks, unreachable scenes, and ending warnings.
- **Character bible:** names, notes, and uploaded portraits.
- **Images:** upload PNG/JPEG/WebP/GIF (4 MB/file), embedded in exported packages. Styled visual placeholders show when no artwork exists.
- **Outline import:** deterministic plain-text syntax for creating interconnected scenes.
- **Portable exports:** editable JSON-based .fieldstory plus a self-contained HTML reader that works offline without a server.
- **Demo:** The Whispering Door, 16 scenes and 3 endings, with a flag-dependent secret route.
- Responsive keyboard-accessible reader and studio, with reduced-motion support.

**Not included yet:** AI writing or image generation, autonomous story parsing, multi-panel page layout, cloud collaboration, animations or voice, PDF printing, WebXR, integration with FieldAtlas/PixelForge/Domistika/PhiOS. Those are deferred, not fake buttons.

## Use it

After GitHub Pages has been enabled and the deployment workflow succeeds, the studio should be available at:

https://michaelwave369.github.io/FieldStoryForge/

Until deployment, run locally:

    npm install
    npm run dev

Open the URL printed by Vite.

## First steps

1. Open The Whispering Door and make a few choices.
2. Click **Edit story** to see how pages, choices, flags, and endings are authored.
3. Create a new story or import a manuscript or explicit branching outline. Preview it and append to preserve existing scenes.
4. Add comic panels and choose a layout, upload art, or use styled placeholders. Drag scenes and connect them in Story Map.
5. Download **Save .fieldstory** to make an editable backup.
6. Click **Publish HTML** to create a single portable offline comic to share without the studio.

**Data and privacy:** Stories are stored in this browser's localStorage. There is no account or API request. Clearing browser data can delete unpublished stories. Storage has quota limits; images are embedded as data URLs and can fill it. Export backups regularly. Avoid private/incognito mode for long-term projects.

## Branching outline syntax

    :: start | The attic
    Someone whispers from behind the door.
    ? Open it -> forest
    ? Walk away -> ending

    :: forest | The other world
    A forest is lit by two moons.
    ? Follow the path -> ending

    :: ending | The End
    The morning comes at last.
    ! ending

The parser understands explicit scene headers, choices, and ending markers. Free prose can be pasted manually as narration, but it is not automatically turned into a branched story by a model.

## The .fieldstory format

See [docs/FORMAT.md](docs/FORMAT.md) for the versioned structure, validation, and limits.

## Development

    npm test
    npm run build
    npx playwright install chromium
    npm run test:e2e

GitHub Actions runs unit tests, the production build, and Playwright smoke tests. A separate Pages workflow deploys after changes land on main.

## Ownership and license

The **software** is MIT licensed. **Stories, character designs, and uploaded art** created by users remain their creators' property and are not automatically licensed under the software's MIT license.

## Next

See [docs/ROADMAP.md](docs/ROADMAP.md). This is Rung 1, a working vertical slice, not a claim that all planned creative features are complete.
