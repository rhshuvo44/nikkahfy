<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Git workflow

`main` is the base branch. New features and fixes go on a topic branch
(`feat/…`, `fix/…`, `chore/…`), never directly on `main`.

- Ship work with the `/ship` command, which branches, runs `lint` / `typecheck` /
  `build`, commits, pushes and opens a PR.
- The user must ask before any commit, push or PR is created. Do not commit
  unprompted, and do not amend, force-push, or push to `main`.
- `.env.local` is gitignored and must never be committed. `.env.example` carries
  empty placeholders only.

# Build order

This is a multi-session build. `docs/sessions.md` is the authoritative
session-by-session task list and `docs/spec.md` is the full product spec. Work
one session at a time and verify it before starting the next.

# Project shape

- MongoDB + Mongoose and Better Auth only. No Prisma/PostgreSQL, no
  Auth.js/NextAuth, no Redux.
- Templates consume the normalized `WeddingTemplateProps` and never query the
  database directly: database → server/data layer → props → template.
