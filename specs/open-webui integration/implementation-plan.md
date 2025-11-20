# Open WebUI Integration Implementation Plan

## Stage 0 – Alignment & Setup
- [x] Review `specs/open-webui integration/requirement.md` with product/design/security to confirm scope and success metrics.
- [x] Inventory existing `src/app/home` layout/components and identify reusable primitives for the three-column redesign.
- [x] Confirm team access to https://gpt.luckybruce.com/ API tokens or OIDC scopes required for proxying via the BFF.
- [x] Create tracking tickets for backend (BFF proxy), frontend (UI/chat), and QA workstreams.

## Stage 1 – Backend Foundations
- [x] Define environment variables/secrets for the Open WebUI base URL and any service credentials; document them in `env.example`.
- [x] Add shared utility in `src/lib/openWebuiClient.ts` for authenticated fetches (handles token forwarding, timeouts, retries, logging).
- [x] Implement `GET /api/open-webui/chats` route handler with schema validation and normalized `{ chats: ChatSummary[] }` response.
- [x] Implement `POST /api/open-webui/chats` route handler for chat creation, including request body validation and error mapping.
- [x] Implement `GET /api/open-webui/chats/[chatId]` handler for full history retrieval with 30s timeout and structured logging.
- [x] Implement `PATCH /api/open-webui/chats/[chatId]` handler to rename/update metadata using upstream `POST /api/chats/{chatId}`.
- [x] Implement `DELETE /api/open-webui/chats/[chatId]` handler with proper 204 handling and optimistic response shape.
- [x] Implement streaming `POST /api/open-webui/chats/[chatId]/messages` handler that proxies to `/api/chat/completions`, streams tokens, and finalizes via `/api/chat/completed` when required.
- [x] Implement `GET /api/open-webui/models` handler with 30s cache per user and capability filtering.
- [x] Add integration tests or mocked unit tests for each handler to verify auth enforcement, happy paths, and error normalization.

## Stage 2 – Frontend Experience
- [x] Refactor `src/app/home/page.tsx` (or equivalent layout) into a responsive three-column grid (25% / 45% / 30%) with mobile fallbacks.
- [x] Build Chat History panel component (`src/components/open-webui/ChatList.tsx`) with list, search, new chat action, and context menu hooks.
- [x] Build Chat Workspace component (`ChatWorkspace.tsx`) with header, model selector (fed by `/api/open-webui/models`), message list, and composer.
- [x] Implement chat message rendering with markdown/code support and streaming indicators.
- [x] Wire up composer to call `/api/open-webui/chats/[chatId]/messages`, handle optimistic insertion of the user message, and stream assistant tokens.
- [x] Integrate model dropdown to refetch models on mount, persist last selection per chat, and disable on load errors.
- [x] Move OCR/PPT/Tianyancha modules into a right-column stack (accordion if necessary) ensuring existing functionality is untouched.
- [x] Add responsive behavior for <1024px screens: toggleable sections or stacked order with chat workspace first.
- [x] Instrument frontend analytics events (`chat_opened`, `chat_created`, `chat_model_changed`) using the existing telemetry helper.
- [x] Implement React Query/Zustand stores for chat list and active chat, including cache invalidation on create/delete.

## Stage 3 – Telemetry & Reliability
- [ ] Extend backend logger to capture `userId`, `chatId`, target endpoint, latency, and status for every proxy call.
- [ ] Add retry/backoff logic for repeated 5xx responses from Open WebUI with circuit-breaker metrics.
- [ ] Ensure request timeouts (30s list/detail, 120s completions) are enforced in the shared client.
- [ ] Emit frontend toasts for failures (create/delete/messages/models) with actionable copy.
- [ ] Add per-user cache (React Query) for model list with 30s stale time.

## Stage 4 – QA & Validation
- [ ] Draft manual test cases based on acceptance criteria in the requirement doc.
- [ ] Run `npm run lint` and `npm run typecheck` after implementation; fix any issues.
- [ ] Execute end-to-end smoke test: login, load chats, create chat, send messages, switch models, and verify right-column tools.
- [ ] Validate unauthenticated calls to `/api/open-webui/*` return 401 using automated tests or Postman.
- [ ] Capture screenshots/video of the new home layout and streaming chat for release notes.

## Stage 5 – Launch Readiness
- [ ] Update documentation (README or docs/feature overview) describing the Open WebUI integration and configuration steps.
- [ ] Ensure monitoring/alerting is in place for the new proxy endpoints (latency, error rate, circuit breaker state).
- [ ] Coordinate release timing with stakeholders; confirm Open WebUI backend capacity for additional load.
- [ ] After deployment, monitor logs/analytics for adoption and regressions; gather feedback for follow-up iterations.
