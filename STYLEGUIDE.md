# OpenGlobus Code Style Guide

This project uses automated tooling to keep style consistent.

## Source of Truth

- `.editorconfig` for base formatting defaults
- `eslint.config.mjs` for linting and code quality rules
- `.prettierrc.js` for formatting

## Recommended Checks

Run locally before opening a PR:

```sh
npm run lint
npm run format:check
npm run test
npm run build
```

`npm run format:check` is currently non-blocking in CI and can be adopted
incrementally for touched files.

## Formatting

- Use spaces, width 4.
- Prefer double quotes in JavaScript/TypeScript.
- Keep semicolons enabled.
- Keep line width at 100 characters when possible.

To apply formatting:

```sh
npm run format
```

## Scope and Conventions

- Keep changes focused on one concern per PR.
- Do not include unrelated formatting-only changes in functional PRs.
- Update docs when changing public behavior or API.
- Document all new public features with JSDoc-style comments.
- Verify documentation build locally with `npm run docs` for feature PRs.
