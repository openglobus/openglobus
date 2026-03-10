# Contributing to OpenGlobus

Thank you for contributing to OpenGlobus.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```sh
npm install
```

3. Run checks locally before opening a PR:

```sh
npm run lint
npm run test
npm run build
```

Useful commands:

- `npm run dev` - watch and build development bundle into `lib/`
- `npm run serve` - run local web server
- `npm run dev_serve` - run watcher and server in parallel
- `npm run docs` - generate API docs in `docs/`
- `npm run format` - apply formatting via Prettier

Style references:

- `STYLEGUIDE.md`
- `.editorconfig`
- `.prettierrc.js`
- `eslint.config.mjs`

## Branch and Commit Naming

- Branch names should follow:
  - `feature/<issue_id>_<short_name>`
  - `bugfix/<issue_id>_<short_name>`
- Include issue reference in commits and PR description (for example, `#123`).

## Pull Requests

- Keep PRs focused and minimal.
- Link the related issue in the PR.
- Ensure all CI checks are green.
- Fill out the PR template checklist.

Local validation checklist:

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

## Reporting Bugs

Use GitHub Issues and include:

- OpenGlobus version
- environment details (browser/OS/tooling)
- minimal reproduction steps
- expected vs actual behavior

## Improving Documentation

Documentation contributions are welcome:

- update README or examples when behavior changes
- improve API docs comments in source code
- run `npm run docs` to verify generated documentation
