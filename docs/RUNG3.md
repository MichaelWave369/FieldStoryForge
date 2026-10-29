# Rung 3 · Art Director acceptance

## Flow

1. Open the demo and select Characters. Add visual appearance, wardrobe, signature traits, and visual continuity notes for Mara; optionally attach a portrait.
2. Select Art Director. Define the story-wide illustration style, aspect ratio, palette, mood, and avoid-list.
3. Add a location with memorable fixed visual anchors.
4. Choose a scene or panel, assign its characters and location, and set composition and lighting.
5. Inspect the generated text brief. Warnings highlight missing descriptive/reference information. Copy one brief or download the complete JSON prompt pack. The pack intentionally contains no artwork files or API keys.
6. Generate artwork in an external tool or draw it manually. Upload the resulting PNG/JPEG/WebP/GIF as a **candidate**, compare with the currently used art, enter descriptive alt text, and explicitly Approve. Discard to reject without changing the book.
7. Verify approved art in the studio reader and the standalone offline HTML export. Download an editable .fieldstory backup.

## Not included

The app does not call an image model, transmit prompts automatically, claim visual identity verification, connect to ComfyUI or other local services, or provide a browser-side API key field. Browser storage limits still apply for images. Model outputs can vary across prompts, and human review remains essential.

## Quality gates

- Legacy .fieldstory/v1 books still import.
- New art-style, cast, location, metadata, and plan fields round-trip.
- Exported prompt packs exclude base64 artwork and credentials.
- Images stay staged until explicitly approved.
- Unit tests, production build, and Playwright author/reader tests pass in GitHub Actions.
