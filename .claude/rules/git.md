# Git Conventions

## Branches

- Never commit directly to `master`
- Always work on a dedicated branch
- Branch naming: `<type>/<short-slug>`
  - Types: `feat`, `fix`, `chore`, `refactor`, `docs`
  - Examples: `feat/stripe-webhook`, `fix/deck-processing-timeout`, `chore/update-deps`

## Commits

Use Conventional Commits format:

```
<type>: <short description>
```

Types:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `chore:` — maintenance, deps, config
- `docs:` — documentation only
- `test:` — adding or updating tests
- `perf:` — performance improvement

Rules:
- Description in lowercase, imperative mood ("add", not "added" or "adds")
- No period at the end
- Keep it under 72 characters

## Pull Requests

- PR-based workflow — all changes go through a PR
- Merge strategy: squash merge
- PR title is free-form
