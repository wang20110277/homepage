# Stage 0 Notes – Open WebUI Integration

## Requirement Review
- Reviewed `specs/open-webui integration/requirement.md` on $(Get-Date -Format "yyyy-MM-dd HH:mm") to confirm objectives, API contracts, and acceptance criteria.
- Highlighted mandatory BFF proxy responsibilities and UI layout expectations for the /home page redesign.

## Home Layout Inventory
- Current `/home` server component (`src/app/home/page.tsx`) renders a welcome banner plus a three-card grid (PPT, OCR, Tianyancha) controlled by RBAC via `checkToolAccess`.
- No existing global state management or React Query provider is present; new chat UI will require client-side data management and stream handling.
- Existing UI primitives: `Card`, `Badge`, Radix `Select`, `ScrollArea`, and `textarea` components already available for reuse.

## Identity & Token Access
- Verified that OIDC tokens are persisted in the `account` table (see `src/lib/schema.ts`), enabling secure retrieval per user for downstream Open WebUI requests.
- Confirmed we can surface these tokens through a new helper (`getUserOidcAccessToken`) and forward them via the upcoming `openWebuiClient` without storing additional secrets.
- No extra app registration is required since both apps share the same Entra registration; `Authorization: Bearer <accessToken>` remains the handshake with https://gpt.luckybruce.com/.

## Tracking Setup
- Implementation plan split into ordered stages inside `specs/open-webui integration/implementation-plan.md` (Stages 0-5) for backlog visibility.
- Created this checkpoint document to log discovery items and serve as the artifact referenced by product/design/security during kickoff.
