# VeniceMediaLocal Agent Control API — Request Types (verified 2026-05-21)

Extracted directly from the running app source (`src-tauri/src/main.rs`) during a live connection test to a real instance (100.64.131.86:9876, token vl-...).

These are the **exact** shapes the HTTP handlers accept. Use them when building bodies for curl, Python requests, or any future client helper.

## AgentRequest wrapper (used by most POST endpoints)

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentRequest<T> {
    #[serde(flatten)]
    request: T,
    navigate: Option<bool>,
}
```

- The inner request fields are promoted to top level in the JSON body thanks to `flatten`.
- `navigate: true` (optional) tells the handler to emit an `agent:navigate` event so the GUI auto-switches tabs (image/edit/video/etc.) for better theater mode.

## ImageGenerationRequest (for POST /api/v1/generate-image)

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageGenerationRequest {
    model: String,
    title: Option<String>,
    prompt: String,
    negative_prompt: Option<String>,
    aspect_ratio: Option<String>,
    resolution: Option<String>,
    variants: Option<u8>,
    steps: Option<u32>,
    cfg_scale: Option<f32>,
    seed: Option<u64>,
    hide_watermark: Option<bool>,
    safe_mode: Option<bool>,
    format: Option<String>,
}
```

**Minimal working body example** (what actually succeeded in the 2026-05-21 verification run):

```json
{
  "model": "flux-2-max",
  "prompt": "cyberpunk cat on a neon motorcycle",
  "variants": 2,
  "aspect_ratio": "16:9"
}
```

The handler:
- Clamps variants 1-4
- Defaults format to "webp"
- Builds the exact Venice API payload
- Calls the real internal `generate_image(...)` (same as the GUI)
- Saves files via `save_media_bytes` into the app's configured output dir
- Emits `agent:results` so cards appear live in the open GUI

## Other key types (abbreviated, same source)

- `BackgroundRemoveRequest { source_image: String }`
- `ImageUpscaleRequest { source_image: String, scale: u8 }` (only 2 or 4)
- `ImageMultiEditRequest { model, prompt, images: Vec<String>, aspect_ratio?, resolution?, safe_mode? }` — used by `/api/v1/edit-image`. `images` must be base64 data URLs, not file paths.
- `QueueMediaRequest` for video/music/SFX queues (has queue_id + retrieve pattern)

## ImageMultiEditRequest (for POST /api/v1/edit-image) — verified 2026-05-21

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageMultiEditRequest {
    model: String,
    prompt: String,
    images: Vec<String>,        // base64 data URLs (e.g. "data:image/webp;base64,...")
    aspect_ratio: Option<String>,
    resolution: Option<String>,
    safe_mode: Option<bool>,
}
```

**CRITICAL:** The `images` field takes base64 data URLs, NOT Windows file paths. The app's `multi_edit_image_input()` passes the string directly to the Venice API `/image/multi-edit` endpoint.

**CRITICAL:** Data URLs are 200-400 KB as JSON. This exceeds curl's argument-list limit. Always use a temp file:

```python
with open('/tmp/edit_payload.json', 'w') as f:
    json.dump(payload, f)
subprocess.run(["curl", ..., "--data-binary", "@/tmp/edit_payload.json"], ...)
```

**Source of data URL:** The `/api/v1/generate-image` response includes `dataUrl` per result item. Capture it from the generation response. If missed, re-generate with the same `seed` to recover an identical image + dataUrl.

**Proven working example (2026-05-21):**
```json
{
  "model": "grok-imagine-quality-edit",
  "prompt": "place the cat in Venice, Italy — canal in the background, gondolas, Renaissance architecture, warm golden light, photorealistic",
  "images": ["data:image/webp;base64,..."],
  "navigate": true
}
```
Response: saved file `edits-<timestamp>-<prompt-slug>.png` in the app output dir.

## GET /api/v1/state — response structure (verified 2026-05-21)

The state object has this shape (top-level keys):
- `agentControlAddress` — e.g. "100.64.131.86:9876"
- `buildVersion` — e.g. "26.5.21"
- `keyConfigured` — bool
- `models` — nested object with: `imageModels`, `editModels`, `videoModels`, `musicModels`, `sfxModels`, `voiceModels`, `transcribeModels`
- `settings` — object with: `agentControlToken`, `enableAgentControl`, `outputDir` (Windows path), etc.

**PITFALL:** Models are at `state['models']['imageModels']`, NOT `state['imageModels']`. The top-level state does NOT have imageModels/editModels/etc directly — they are one level deeper under `models`.

**outputDir** is at `state['settings']['outputDir']`, e.g. `C:\Users\flash\Desktop\VeniceMedia`.

## Recommended agent flow (proven in this session)

1. `GET /api/v1/state` (with Bearer) — confirms reachability, returns current models + settings + output dir.
2. Optional: `POST /api/v1/refresh-models` if you need fresh list.
3. `POST /api/v1/generate-image` (or edit/queue variants) using the shapes above.
4. **Always** tell the human after success:  
   "Check the Venice Media Local window on the ripper — I just generated ... and they should be visible now."

This pattern guarantees the human experiences true theater mode (watching the work happen in the familiar GUI).

## Notes

- All fields use camelCase in JSON.
- The app's internal Venice client (`venice_post_json`) uses whatever API key is configured inside the GUI settings.
- Event emission for live cards was confirmed working on the 2026-05-21 instance (the "in progress" note in the main skill can be treated as resolved for practical purposes).

Keep this file in sync by re-extracting the structs from the repo's `src-tauri/src/main.rs` whenever the app is updated.