# Rung 2 acceptance: Larrina's living-comic workflow

1. Open the local-first studio and create a book.
2. Import a .txt/.md story or paste prose. Review preview scene titles; choose Append (default). Replace requires explicit confirmation.
3. In Pages & choices, select a scene. Add up to eight panels, enter captions and dialogue, upload artwork, choose cinematic, grid, stack, or split, and reorder with Move up/down.
4. In Story map, drag nodes to positions. Activate Connect scenes, click a source, then a destination. Edit the new choice label in Pages & choices.
5. Undo/redo edits in the current session. Back up using Save .fieldstory.
6. Read the comic and check panels, choices, flags, endings, and backtracking.
7. Publish standalone HTML, disconnect from the network, then open the export and make choices.

Known limitations: plain prose imports get linear "Turn the page" choices only. AI art and semantic choice extraction remain out of scope. Embedded images can exceed browser storage quotas. Undo history is limited to 40 in-session steps. Comic panel positions are predefined, not freeform draggable. The visual map supports dragging nodes and click-to-connect, not drag-to-create edges.

The canonical story.js engine remains the source of truth. New Rung 2 fields are optional, and all earlier books still load. Other Φ369 repositories are unchanged.

Automated checks: normalization, import, safe serialization, HTML export and map positions; Chromium smoke tests for panels/undo/import/map connections; CI for unit tests and build.
