---
description: Branch, verify, commit, push and open a PR. Use when shipping a feature or session to GitHub.
agent: build
---

Ship the current work in this repository to GitHub.

Requested scope: $ARGUMENTS

Follow these steps in order. Do not skip the verification step.

## 1. Inspect before touching anything

Run `git status`, `git log --oneline -10`, and `git diff`.

- Report what is uncommitted and which branch is checked out.
- If the tree has changes you were not asked to ship (stray debug files, `.env*`,
  build output, editor cruft), list them and **leave them out** of the commit.
- Never stage `.env.local` or any file matching a secret pattern. `.env.example`
  with empty placeholders is fine.
- If there is genuinely nothing to commit, say so and stop.

## 2. Branch

If the current branch is `main`, create a new branch before committing:

- `feat/<slug>` for a feature, `fix/<slug>` for a bug, `chore/<slug>` otherwise.
- Derive `<slug>` from the requested scope, lowercase, hyphenated.
- If the current branch is already a topic branch, use it as-is.

## 3. Verify

Run all three and fix anything they surface before committing:

```bash
npm run lint
npm run typecheck
npm run build
```

The build needs a valid `.env.local` (see `.env.example`). If `MONGODB_URI` is
still the placeholder, say that the build passed but the runtime could not be
verified, rather than claiming the feature works.

## 4. Commit

- Stage only the files that belong to this change: `git add <paths>`.
- Match the existing message style — a conventional-commit subject line, then a
  body explaining *why* and calling out anything surprising (framework API
  changes, data-model decisions, deferred work).
- Do not use `--amend`, `--no-verify`, or force anything.

## 5. Push

```bash
git push -u origin <branch>
```

If the push is rejected, stop and report it. Do not force-push.

## 6. Pull request

```bash
gh pr create --base main --head <branch> --title "<subject>" --body "<body>"
```

The PR body should state what changed, how it was verified, and what is
explicitly *not* done yet.

## 7. Report back

Give the user: the branch name, the commit SHA, the PR URL, and an honest
summary of what was and was not verified. Return the PR URL so it can be shared.
