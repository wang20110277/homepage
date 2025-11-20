# Open WebUI Integration Requirement

## Context
- Product: Next.js 15 app with BFF layer (`src/app/api`) mediating all data access.
- Existing home page currently shows OCR, PPT, Tianyancha tools after OIDC login.
- New tool: Managed Open WebUI deployment at https://gpt.luckybruce.com/ that already shares the same OIDC app registration and hosts both chat runtime and chat history storage.

## Objectives
1. Surface Open WebUI chat as a first-class tool on the default home route for every authenticated user (no per-user entitlement toggles).
2. Present a vertically-split three-column layout: left = chat history list, middle = chat workspace, right = existing OCR/PPT/Tianyancha modules.
3. Integrate with Open WebUI APIs through the BFF so the frontend never calls https://gpt.luckybruce.com/ directly and can reuse the user"s OIDC context.
4. Keep all chat persistence on Open WebUI. Our frontend only displays and manipulates data through APIs; no duplication in our database.

## Non-Goals
- Changing authentication flows or provisioning new OIDC apps.
- Migrating chat history into our database.
- Replacing existing OCR/PPT/Tianyancha behaviors (they only move into the right column).

## User Stories
- As an authenticated user, I land on /home and immediately see previously created Open WebUI chats in the left column sorted by last activity.
- As an authenticated user, I can create a new chat, rename, delete, or duplicate an existing chat via controls in the left column.
- As an authenticated user, I can select a chat and continue the conversation in the middle column chat workspace with streaming responses.
- As an authenticated user, I can choose any model I have access to from a dropdown above the composer. The list is sourced from Open WebUI model metadata.
- As an authenticated user, my OCR/PPT/Tianyancha tools remain accessible in the right column without extra navigation.

## Functional Requirements

### Authentication & Authorization
- Our NextAuth (or equivalent) session already includes the user"s OIDC tokens; BFF endpoints must validate the session and forward the user access token (or exchange for a service token) to Open WebUI APIs via the Authorization: Bearer header.
- Every BFF handler under `src/app/api/open-webui/*` must reject unauthenticated requests with 401 and avoid leaking remote responses.

### BFF Contracts (Next.js Route Handlers)
Implement a thin proxy layer with schema validation and error normalization.
- `GET /api/open-webui/chats`: Fetches `GET https://gpt.luckybruce.com/api/chats` and returns `{ chats: ChatSummary[] }` sorted descending by `updated_at`.
- `POST /api/open-webui/chats`: Calls `POST /api/chats/new` with `{ model, title? }` to create a session.
- `GET /api/open-webui/chats/{chatId}`: Loads full history via `GET /api/chats/{chatId}`.
- `PATCH /api/open-webui/chats/{chatId}`: Allows rename/metadata updates using `POST /api/chats/{chatId}`.
- `DELETE /api/open-webui/chats/{chatId}`: Deletes via `DELETE /api/chats/{chatId}`.
- `POST /api/open-webui/chats/{chatId}/messages`: Sends messages to `POST /api/chat/completions` with the remote chat payload, streams responses back to the client (Server Sent Events or fetch streaming reader) and ends with the persisted chat object.
- `GET /api/open-webui/models`: Wraps `GET /api/models` so the UI can populate the dropdown. Include fields `id`, `label`, `provider`, `capabilities` to distinguish chat vs. multimodal models.
- All handlers should surface validation failures in `{ error: string, status: number }` format and log remote errors via our existing logger.

### Frontend UX (src/app/home)
- Convert home page layout into CSS grid/flex with three vertical columns occupying roughly 25% / 45% / 30% widths.
- Left column features:
  - Scrollable list of chats with title, last message preview, updated timestamp.
  - Buttons for new chat (+) and search/filter.
  - Context menu for rename/delete/duplicate.
- Middle column features:
  - Header containing chat title and model selector dropdown (populated from `/api/open-webui/models`). Default to the previously used model.
  - Message history viewer reusing Open WebUI message roles (system/user/assistant/files). Support markdown + code blocks + attachments indicator.
  - Composer with multiline textarea, upload button (future), send button, abort button while streaming.
  - Streaming responses with typing indicator.
- Right column features:
  - Stack existing cards/components for OCR, PPT, Tianyancha, preserving their current controls. Ensure responsive behavior so each tool retains minimum height; use accordions if vertical space is tight.
- Responsive behavior: on screens <1024px collapse columns into a stacked layout with toggles; by default show chat workspace first.

### State Management & Data Handling
- Use React Query/Zustand (consistent with existing codebase) for caching chat lists and chat detail responses.
- Keep optimistic updates minimal; rely on server responses for message order.
- When streaming chat completions, append tokens incrementally and finalize when `/api/chat/completed` (if required) confirms persistence.
- Ensure selecting a chat cancels in-flight requests for the previous chat to avoid leaks.

### Telemetry & Logging
- BFF should emit structured logs for every proxy call containing user id, chat id, target endpoint, status, and latency.
- Frontend should hook into existing analytics emitter to log events: chat_opened, chat_created, chat_model_changed.

## Error Handling
- Display inline toasts for create/delete failures with the normalized error message.
- If the model list fails, disable dropdown and show fallback copy.
- Streaming interruptions must be recoverable: show retry button and keep unsent user message in composer.

## Security & Performance
- All requests must originate from our domain; enforce CORS only for our frontend.
- Never expose the remote Open WebUI base URL or bearer tokens to the browser; BFF owns the secrets.
- Add a short per-user cache (30s) for the model list to reduce load.
- Apply request timeouts (30s for list/detail, 120s for completions) and circuit-breaker style backoff on repeated 5xx responses.

## Acceptance Criteria / Manual Test Plan
1. Login via OIDC and land on /home; verify three-column layout renders and chat list populates from existing remote sessions.
2. Create a new chat, select a model, send a prompt, observe streamed response, refresh page, and see history persist (served from remote).
3. Rename and delete chats and ensure list updates immediately.
4. Switch models via dropdown and confirm subsequent completions use the selected model (inspect payload via devtools or mocked logger).
5. Confirm OCR/PPT/Tianyancha features remain functional in the right column.
6. Validate unauthenticated calls to `/api/open-webui/*` return 401 and no remote traffic occurs.
