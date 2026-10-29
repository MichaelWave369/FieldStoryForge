# .fieldstory format (v1)

A .fieldstory is UTF-8 JSON using the fieldstory/v1 format marker. It is portable and can be read without FieldAtlas or any Φ369 service.

Top-level properties:
- format: exact string fieldstory/v1
- id: 1-80-character [A-Za-z0-9_-] identifier
- title, author, description, genre: plain-text metadata
- start: ID of the first scene
- scenes: ordered list of 1-500 objects
- characters: optional list of up to 50 character profiles
- updatedAt: optional human-readable modification time

Each scene has id, title, narration, dialogue, image, imageAlt, artworkNote, ending, choices.

A choice has id, text, to (destination scene ID), plus optional:
- condition: { "flag": "key", "equals": "yes" }
- effect: { "flag": "trust", "value": "yes" }

Conditions test string equality; missing flags count as empty strings. Effects apply after an available choice is selected, before the destination renders. Returning to a prior choice restores the flag snapshot. History is bounded to 200 snapshots. Branch graphs may contain cycles. No JavaScript, arbitrary expressions, or eval is supported.

Images must be embedded as base64 data:image/png, jpeg, webp, or gif URLs. HTML, SVG, remote image URLs, scripts, and other URI types are discarded by the importer. Input is normalized into known fields.

The importer limits a story to 500 scenes, 12 choices per scene, 3000 choices total, 50 characters, embedded images under 6 million data-URL characters per field, and an 8 MB import file. The UI limits uploaded images to 4 MB.

validateStory reports dangling destinations and duplicate scene IDs as errors, plus unreachable nodes and unmarked dead ends as warnings. A standalone HTML export is refused if validation errors exist.

Example:

    {
      "format": "fieldstory/v1",
      "id": "my-story",
      "title": "An Unexpected Road",
      "author": "The Author",
      "description": "",
      "genre": "Mystery",
      "start": "opening",
      "characters": [],
      "scenes": [
        {
          "id": "opening",
          "title": "The Station",
          "narration": "A train arrives.",
          "dialogue": "",
          "image": "",
          "imageAlt": "",
          "artworkNote": "",
          "ending": false,
          "choices": [
            { "id": "board", "text": "Board the train", "to": "end",
              "condition": null, "effect": { "flag": "boarded", "value": "yes" } }
          ]
        },
        {
          "id": "end", "title": "Destination", "narration": "You arrive.",
          "dialogue": "", "image": "", "imageAlt": "", "artworkNote": "",
          "ending": true, "choices": []
        }
      ]
    }

Version changes must be explicit; future readers must migrate older versions rather than guessing silently.

## Rung 2 additive scene and story fields

The format marker remains fieldstory/v1 because new fields are optional. New scene fields:

- layout: cinematic, grid, stack, or split; default cinematic.
- panels: up to eight objects with id, caption, dialogue, image, imageAlt, and artworkNote. Each image uses the existing data-image allowlist. When panels are absent, the original single-image page renders.

New story field:

- mapPositions: scene ID to {x, y} coordinates, bounded to 5-4800, used only by the editor visual graph.

The manuscript importer recognizes Markdown headings and Chapter N headings; other plain prose becomes conservative linear pages. It does not infer meaningful alternate endings from arbitrary prose. Append mode remaps colliding IDs; Replace requires confirmation.
