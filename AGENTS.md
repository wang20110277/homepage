# Repository Guidelines

## Project Structure & Module Organization
Next.js 15 workspace: `src/app` handles routes and pages (API handlers in `src/app/api`, dashboards in `src/app/dashboard`), while UI lives in `src/components` (feature folders such as `dashboard/`, `auth/`, shared primitives in `ui/`). Shared logic sits in `src/contexts`, `src/hooks`, `src/lib`, and `src/types`. Keep database work inside `drizzle/` plus `drizzle.config.ts`, static assets in `public/`, reference docs in `docs/`, and product briefs in `specs/`.

## Build, Test, and Development Commands
- `npm run dev`: Start the Turbopack dev server for local work.
- `npm run build`: Runs `npm run db:migrate` before compiling the production bundle.
- `npm run start`: Serve the compiled output for smoke tests.
- `npm run lint` / `npm run typecheck`: ESLint 9 and `tsc --noEmit`; they must pass before committing.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`: Generate, apply, and review Drizzle migrations.

## Coding Style & Naming Conventions
Stick to TypeScript, 2-space indentation, ES modules, and functional React components. Files and components follow PascalCase (`UserProfile.tsx`), hooks use camelCase (`useChatStore.ts`), and constants/env keys stay in SCREAMING_SNAKE_CASE. Compose styles with Tailwind utilities plus `clsx`/`tailwind-merge`. Honor `eslint.config.mjs`; align any formatter or codegen output with those rules.

## Testing Guidelines
No dedicated runner ships yet; treat `specs/Requirement.md` as the acceptance contract and write the manual smoke steps you executed in each PR. When you add automated coverage, co-locate `*.spec.ts(x)` files with the code, prefer React Testing Library + Vitest for units, and reach for Playwright when you need an end-to-end flow. Always run `npm run lint` and `npm run typecheck` before pushing.

## Commit & Pull Request Guidelines
History follows Conventional Commits (`refactor:`, `feat:`). Keep subjects imperative, 72 characters or fewer, and limit each branch to a single concern. PRs need a short summary, linked issue when relevant, confirmation that lint/typecheck/db migrations ran, screenshots or logs for UI edits, and notes about manual or automated tests. Small, reviewable diffs ship fastest.

## Security & Configuration Tips
Store secrets only in `.env`, seeding from `env.example`. Required keys include `POSTGRES_URL`, `BETTER_AUTH_SECRET`, Google OAuth credentials, and optional OpenRouter tokens; verify them before running migrations or `npm run build`. When touching auth or database flows, update both `src/lib/auth*.ts` and `drizzle/` to keep schema and logic in sync.
