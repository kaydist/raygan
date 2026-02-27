# PRD: Image Upload & Vision Support for Agent Chat

**Version:** 1.0
**Date:** 2026-02-26
**Status:** Draft
**Product:** Raygan — AI-Powered No-Code Mobile App Builder

---

## 1. Overview

### 1.1 Problem Statement

Raygan's Agent Mode currently only accepts text-based prompts. Users with visual references — screenshots, Figma exports, wireframes, or hand-drawn sketches — must describe their designs in words. This is inherently lossy: a complex UI layout may require hundreds of words to describe, and the AI may still misinterpret it. This creates friction, especially for design-driven users who think visually first.

### 1.2 Goals

1. **Reduce prompt-to-output friction** — Users paste or attach an image and receive React Native (Expo) code that matches the visual design in a single interaction.
2. **Activate existing vision capabilities** — The `ModelInfo` type already carries `supports_vision: boolean`. Models are seeded with this flag. This feature activates that dormant capability.
3. **Maintain simplicity** — Images are sent inline as base64 within the existing JSON/SSE pipeline. No separate upload service, CDN, or storage bucket for V1.
4. **Cross-model compatibility** — Works across all vision-capable providers (Anthropic Claude, OpenAI GPT-4o, Google Gemini, xAI Grok) using each provider's native image content block format.

### 1.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Adoption rate | 20% of active agent sessions include at least one image within 30 days | Analytics event tracking |
| First-try accuracy | Images produce usable layouts >=60% of the time (user does not immediately re-prompt same screen) | Follow-up prompt heuristic |
| Latency impact | P95 time-to-first-token increases by no more than 2s with images | Server-side metrics |
| Error rate | <2% of image submissions result in errors | Error tracking |

---

## 2. User Stories

### US-1: Paste a Screenshot from Clipboard
**As a** user designing a mobile app,
**I want to** paste a screenshot directly into the agent chat (Cmd/Ctrl+V),
**So that** the AI can see my reference and generate matching React Native code.

**Acceptance Criteria:**
- Pasting an image from clipboard creates a thumbnail preview in the input area
- The image is attached to the next prompt submission
- The user can still type text alongside the pasted image
- The image preview has a remove button (X) to detach before sending

### US-2: Upload an Image File via File Picker
**As a** user with a design file saved locally,
**I want to** click an attach button to browse and select image files,
**So that** I can upload wireframes or exported designs from my file system.

**Acceptance Criteria:**
- An attach button is visible in the prompt input area
- Clicking it opens the native file picker filtered to image types (PNG, JPEG, WebP, GIF)
- Selected files appear as thumbnail previews in the input area
- Multiple images can be attached (up to the defined limit)

### US-3: Drag and Drop an Image
**As a** user with a design open in another application,
**I want to** drag an image file onto the chat input area,
**So that** I can quickly attach visuals without navigating file pickers.

**Acceptance Criteria:**
- The input area shows a drop zone indicator when an image is dragged over it
- Dropping an image creates a thumbnail preview
- Dropping non-image files shows an error toast and rejects the drop

### US-4: Image Displayed in Conversation History
**As a** user reviewing a conversation,
**I want to** see images I sent rendered inline within my messages,
**So that** I can recall the visual context of each prompt.

**Acceptance Criteria:**
- User messages with images display clickable thumbnails
- Clicking a thumbnail opens the image in a lightbox overlay
- Images render alongside the text portion of the message

### US-5: Vision Model Validation
**As a** user with a non-vision model selected,
**I want to** be informed my model doesn't support images,
**So that** I can switch to a compatible model before sending.

**Acceptance Criteria:**
- When images are attached and the selected model has `supports_vision: false`, a warning appears
- The warning suggests switching to a vision-capable model
- The send button is not blocked — user can choose to send text-only or switch models

### US-6: Multiple Images in One Prompt
**As a** user building a multi-screen app,
**I want to** attach up to 4 images in a single prompt,
**So that** the AI can understand the full app flow.

**Acceptance Criteria:**
- Up to 4 images can be attached per prompt
- Attempting to add a 5th shows a limit warning
- Each thumbnail can be individually removed

---

## 3. Functional Requirements

### 3.1 Image Input Sources

| Source | Trigger | Details |
|--------|---------|---------|
| Clipboard paste | Cmd/Ctrl+V in the prompt textarea | Intercept `paste` event, detect `image/*` MIME types from `clipboardData.items` |
| File picker | Click attach button | Hidden `<input type="file" accept="image/*" multiple>` triggered by button |
| Drag and drop | Drag file onto input area | `dragover`/`drop` events on the prompt container, validate MIME types |

### 3.2 Supported Formats and Limits

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp`, `image/gif` | Supported by Anthropic and OpenAI vision APIs |
| Max file size per image | 5 MB (before encoding) | Anthropic limit is 5 MB for base64 images |
| Max images per prompt | 4 | Balances token cost with multi-screen workflows |
| Max total payload | 20 MB (all images + text) | Prevents request timeouts and server memory pressure |
| Image encoding | base64 (raw string, no data URI prefix) | Native format for both Anthropic and OpenAI APIs |
| Min dimensions | 10x10 px | Reject obviously invalid images |
| Max dimensions | 8192x8192 px | Beyond this, providers may reject |

### 3.3 Client-Side Image Processing

Before sending, the frontend must:
1. **Validate** format, size, and dimensions
2. **Resize** images exceeding 2048px on longest edge down to 2048px (preserving aspect ratio) using `<canvas>`
3. **Convert** to base64 via `FileReader.readAsDataURL()`, then strip the `data:image/...;base64,` prefix
4. **Store** in component state as `{ id, base64, media_type, filename, width, height, size_bytes }`

### 3.4 UI Behavior

**Prompt Input Area:**
- Add an attach button (`Paperclip` icon from lucide-react) to the left of the send button
- When images are attached, show a horizontal strip of thumbnails (64x64px, rounded) above the textarea
- Each thumbnail has an X button overlay for removal
- Textarea placeholder changes to `"Describe this design..."` when images are attached

**Model Compatibility Warning:**
- When images are attached and selected model has `supports_vision === false`, show a yellow warning bar below thumbnails
- Suggest switching to a vision-capable model

**Send Flow:**
- Both text and image data included in request body
- Input clears both text and images on send
- If text is empty but images are present, auto-fill: `"Analyze this image and generate matching React Native (Expo) code."`

### 3.5 Message Display

**User messages:** Render image thumbnails (120px wide, proportional height) above the text content. Clicking opens a full-screen lightbox.

**Assistant messages:** No changes — assistant never sends images back.

### 3.6 AI Processing

**System Prompt Augmentation:** When images are present, inject into system prompt:
> "The user has attached image(s) showing a UI design or wireframe. Analyze the visual layout, spacing, colors, typography, and component hierarchy. Generate React Native (Expo) code that faithfully reproduces the design."

**Provider-Specific Mapping:**

| Provider | Image content block format |
|----------|--------------------------|
| Anthropic | `{ type: "image", source: { type: "base64", media_type, data } }` |
| OpenAI | `{ type: "image_url", image_url: { url: "data:<type>;base64,<data>" } }` |
| Google | `{ inlineData: { mimeType, data } }` |
| xAI | OpenAI-compatible format |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target |
|-------------|--------|
| Client-side image processing (resize + encode) | < 500ms for a 5MB image |
| Total request upload time | < 5s on 10 Mbps connection for max payload |
| Time-to-first-token with image | < 8s (vs ~3s text-only) |
| Memory | Canvas element released immediately after encoding |

### 4.2 Security

- Images are **not persisted** in V1 — they exist only in browser memory and HTTP request body
- Conversation database stores only text; image data is not saved
- Base64 data validated server-side (magic bytes check) before forwarding to AI providers
- Images transmitted over HTTPS only
- No user-uploaded images are served to other users

### 4.3 Browser Support

| Browser | Min Version | Paste | File Picker | Drag-Drop |
|---------|------------|-------|-------------|-----------|
| Chrome | 90+ | Yes | Yes | Yes |
| Firefox | 90+ | Yes | Yes | Yes |
| Safari | 15+ | Yes | Yes | Yes |
| Edge | 90+ | Yes | Yes | Yes |

### 4.4 Accessibility

- Attach button: accessible label `"Attach image"`
- Thumbnails: alt text (filename or `"Uploaded image 1 of N"`)
- Remove buttons: keyboard-navigable, labeled `"Remove image"`
- Lightbox: traps focus, Escape to close

---

## 5. User Experience

### 5.1 Attach Flow

```
1. User opens agent chat for a project
2. User attaches image via:
   a. Click paperclip → file picker → select 1-4 images
   b. Cmd/Ctrl+V with image on clipboard
   c. Drag image file(s) onto prompt area
3. For each image:
   a. Validate format + size
   b. If invalid → toast with specific error
   c. If valid → resize if needed, encode to base64
   d. Thumbnail appears in attachment strip above textarea
4. User types accompanying text (optional)
5. If non-vision model selected → warning bar appears
6. User clicks Send or presses Enter
7. User message appears in chat with thumbnails + text
8. AI processes and streams response
9. Input clears (text + images)
```

### 5.2 Error States

| Error | UI Behavior |
|-------|-------------|
| File too large (> 5MB) | Toast: "Image exceeds 5MB limit. Please use a smaller image." |
| Unsupported format | Toast: "Unsupported format. Please use PNG, JPEG, WebP, or GIF." |
| Too many images (> 4) | Toast: "Maximum 4 images per prompt. Remove an image to add another." |
| Image processing failure | Toast: "Failed to process image. Please try again." |
| Network timeout on large payload | Error banner: "Request timed out. Try with fewer or smaller images." |
| Non-vision model selected | Warning bar in input area (non-blocking) |
| Server rejects payload (size) | Error banner from SSE error event |

### 5.3 Empty State Update

When the chat is empty, update subtitle:
- Current: "Describe your app and I'll generate the code for you"
- New: "Describe your app or paste a screenshot and I'll generate the code"

---

## 6. Technical Architecture

### 6.1 High-Level Approach

Images are embedded as base64 directly in the JSON request body to `POST /api/v1/projects/:projectId/generate`. No separate upload service, storage bucket, or CDN needed.

```
[Browser]                    [Express API]                [AI Provider]
    |                             |                            |
    |  POST /generate             |                            |
    |  { prompt, images[] }       |                            |
    |  --------------------------->                            |
    |                             |  Build MessageContentBlock |
    |                             |  with ImageBlock(s)        |
    |                             |                            |
    |                             |  Map to provider format    |
    |                             |  --------------------------->
    |                             |                            |
    |  <-- SSE text/code stream --|  <-- stream response ------|
```

### 6.2 Payload Size Considerations

A 5MB image base64-encoded becomes ~6.67MB (33% overhead). With 4 images at max, payload could reach ~27MB. Mitigations:
1. **Client-side resizing** to 2048px typically reduces a 5MB photo to ~500KB-1MB
2. **Server-side validation** rejects payloads exceeding 20MB
3. **Express body parser limit** increased to 25MB for the generate route

### 6.3 Token Cost Impact

| Provider | Approximate cost per image |
|----------|---------------------------|
| Anthropic | ~1600 tokens for 1000x1000px image |
| OpenAI | ~765 tokens high-detail, ~85 tokens low-detail |

The token estimator in the agent loop must account for image tokens using a flat estimate per image.

### 6.4 Conversation History

Images are NOT included when replaying conversation history. Historical messages load as text-only from the database. This prevents token cost explosion on subsequent turns.

---

## 7. API Changes

### 7.1 Request Format

**Endpoint:** `POST /api/v1/projects/:projectId/generate`

**New body (images field is optional, additive):**
```json
{
  "prompt": "Build a login screen that looks like this",
  "model_id": 1,
  "images": [
    {
      "media_type": "image/png",
      "data": "<base64-string>",
      "filename": "login-mockup.png"
    }
  ],
  "current_file": "screens/HomeScreen.tsx",
  "max_tokens": 4096,
  "temperature": 0.7
}
```

When `images` is omitted or empty, behavior is identical to today.

### 7.2 Response Format

No changes. AI response remains text/code streamed via existing SSE event types.

### 7.3 Server-Side Validation

| Field | Validation | Error Code |
|-------|-----------|------------|
| `images` | Optional array, max length 4 | `TOO_MANY_IMAGES` |
| `images[].media_type` | One of `image/png`, `image/jpeg`, `image/webp`, `image/gif` | `UNSUPPORTED_IMAGE_FORMAT` |
| `images[].data` | Valid base64, decoded size <= 5MB | `IMAGE_TOO_LARGE` |
| `images[].data` | Magic bytes match declared `media_type` | `INVALID_IMAGE_DATA` |
| Total payload | <= 20MB | `PAYLOAD_TOO_LARGE` |

### 7.4 Express Configuration

```typescript
router.post(
  "/projects/:projectId/generate",
  express.json({ limit: "25mb" }),
  authenticate,
  generateForProject
);
```

---

## 8. Data Model Changes

### 8.1 Backend — AI Gateway Types (`services/api/src/services/ai-gateway/types.ts`)

Add `ImageBlock` to `MessageContentBlock` union:

```typescript
export interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    data: string;
  };
}

export type MessageContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ImageBlock;
```

### 8.2 Backend — Generation Service (`services/api/src/services/generation.service.ts`)

Add to `GenerateOptions`:

```typescript
images?: Array<{ media_type: string; data: string; filename?: string }>;
```

### 8.3 Frontend — Agent Types (`apps/web/src/features/agent/types/index.ts`)

```typescript
export interface ImageAttachment {
  id: string;
  base64: string;
  media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  filename?: string;
  width: number;
  height: number;
  size_bytes: number;
}
```

Add `images?: ImageAttachment[]` to `Message` interface.

### 8.4 Database Changes

**None for V1.** Images are transient. The `conversations.content` column stores text only.

---

## 9. Edge Cases & Error Handling

### 9.1 Non-Vision Model Selected

| Scenario | Behavior |
|----------|----------|
| Images attached, non-vision model selected | Yellow warning: "This model doesn't support images. Switch to [Model] or remove images." |
| User sends anyway | Images silently stripped; text-only prompt sent. Toast: "Images removed — selected model doesn't support vision." |
| No vision models available | Warning: "No models with image support are available." |

### 9.2 Oversized Images

| Scenario | Behavior |
|----------|----------|
| Single image > 5MB | Client rejects before encoding; toast with size error |
| Image > 2048px longest edge | Client silently resizes to 2048px |
| Total payload > 20MB | Client-side check before send; toast |
| Server payload check fails | Express 413; SSE `onError` fires |

### 9.3 Unsupported Formats

| Scenario | Behavior |
|----------|----------|
| SVG | Toast: "SVG not supported. Export as PNG or JPEG." |
| PDF | Toast: "Only image files supported (PNG, JPEG, WebP, GIF)." |
| HEIC (iOS) | Toast: "HEIC not supported. Convert to PNG or JPEG." |
| Corrupted file | Server magic bytes check fails; `INVALID_IMAGE_DATA` error |

### 9.4 Conversation History

| Scenario | Behavior |
|----------|----------|
| Page reload | Historical messages show text only; no image thumbnails |
| AI re-prompted | Previous turns' images NOT re-sent; text only in history |

---

## 10. Out of Scope

| Item | Rationale |
|------|-----------|
| Figma API integration | Separate feature involving OAuth + Figma REST API |
| Image storage/history | Requires object storage (S3/Supabase Storage); deferred |
| Image generation by AI | Output-only; we are adding input vision |
| Camera capture | Users can screenshot and paste instead |
| URL-based image input | All images must be local files or clipboard data |
| Video input | Not supported |
| Multi-turn image context | V1 sends images only in current turn |
| Image annotation/cropping | Use external tools |
| Builder Mode image input | Scoped to Agent Mode only |

---

## 11. Dependencies

### Existing (Ready)

| Dependency | Status |
|------------|--------|
| Vision-capable models in DB with `supports_vision: true` | Ready |
| `ModelInfo.supports_vision` flag propagated to frontend | Ready |
| SSE streaming pipeline | Ready |
| Anthropic SDK ^0.74.0 (supports `ImageBlockParam`) | Ready |
| OpenAI SDK ^6.22.0 (supports `image_url`) | Ready |
| `lucide-react` icons (`Paperclip`, `X`, `ImagePlus`) | Ready |

### New (Trivial)

| Requirement | Complexity |
|-------------|-----------|
| Increase Express body parser limit for generate route | Trivial |
| Client-side canvas resize utility | Low |
| Base64 magic bytes validation (server) | Low |

---

## 12. Rollout Plan

### Phase 1: Backend (Week 1)
1. Add `ImageBlock` type to `MessageContentBlock` union
2. Add `images` to `GenerateOptions` and controller request extraction
3. Validate images in controller (format, size, count)
4. Increase Express JSON limit for generate route
5. Update `PromptBuilder` to inject vision system prompt when images present
6. Update `runAgentLoop` to construct user messages with `ImageBlock`s
7. Update Anthropic adapter to map `ImageBlock` to native format
8. Update OpenAI adapter to map `ImageBlock` to `image_url` format
9. Update token estimator for image tokens

### Phase 2: Frontend (Week 1-2)
1. Add `ImageAttachment` type and extend `Message`
2. Create `useImageAttachments` hook (add, remove, validate, resize, encode)
3. Add attach button, paste handler, drag-drop to `PromptInput`
4. Add thumbnail strip with remove buttons
5. Add vision model warning bar
6. Update `useGenerate` to include images in request body
7. Update `MessageBubble` to render image thumbnails in user messages
8. Add image lightbox overlay

### Phase 3: Polish (Week 2)
1. Test all four providers
2. Edge case testing (large images, many images, non-vision models, corrupted files)
3. Performance measurement
4. Accessibility audit
5. Update empty state text
6. Analytics events

---

## 13. Open Questions

| # | Question | Recommendation | Decision |
|---|----------|----------------|----------|
| 1 | Auto-switch to vision model when images attached? | Warn with suggestion, don't auto-switch — users may have cost preferences | Pending |
| 2 | Empty text + images auto-fill a default prompt? | Yes, auto-fill "Analyze this image and generate matching React Native (Expo) code." | Pending |
| 3 | Count image prompts as additional credits? | 1 image prompt = 1 credit for V1 (simplify billing, revisit with usage data) | Pending |
| 4 | Max image resize dimension? | 2048px — good balance of quality and token cost | Pending |
| 5 | Store `has_images` flag in conversations table? | Defer to V2 — minimal value without image storage | Pending |
| 6 | Support images in non-agent (simple streaming) path? | Yes, both paths should support — vision and tool-use are independent | Pending |
