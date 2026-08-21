# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite React app written in TypeScript. Source code lives under `src/`.

- `src/App.tsx` coordinates the current screen state and top-level app flow.
- `src/pages/` contains page components and their paired CSS files, for example `LoginPage.tsx` and `LoginPage.css`.
- `src/services/` contains API clients for auth, user, learning, practice, scraps, and subscriptions.
- `src/hooks/` wraps React Query data access.
- `src/types/` holds shared API/domain types.
- `src/assets/` stores image and icon assets.
- `docs/design-system.md` documents Dojeon color tokens.

Build output is generated in `dist/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the local Vite dev server.
- `npm run build` runs TypeScript build checks and creates a production bundle.
- `npm run lint` runs ESLint over TypeScript/React files.
- `npm run preview` serves the built `dist/` output locally.
- `npm run deploy` builds and publishes `dist/` to GitHub Pages via `gh-pages`.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Prefer `PascalCase` for components, `camelCase` for functions and variables, and page-specific CSS class prefixes such as `login-*`, `class-*`, or `lesson-detail-*`.

Keep CSS colocated by page in `src/pages/`. Use two-space indentation in JSON and follow the existing TypeScript formatting style. Run `npm run lint` before submitting changes.

## Design System Rules

Use `--dojeon-color-*` CSS variables from `src/index.css` instead of hard-coded UI colors. Preserve existing package, function, and theme structure unless the task explicitly requires changing it.

## Testing Guidelines

No test runner is currently configured. Until Vitest/React Testing Library is added, validate changes with `npm run lint` and `npm run build`. For UI changes, also smoke-test the relevant screen in `npm run dev`; use query previews such as `?screen=class` when available.

## Commit & Pull Request Guidelines

Recent commits use short conventional messages, often `fix: ...` with Korean summaries. Keep commits focused and descriptive.

Pull requests should include a concise summary, verification commands run, linked issues when applicable, and screenshots for visible UI changes. Mention any API, environment, or GitHub Pages deployment changes explicitly.

## Security & Configuration Tips

Do not commit secrets. Local-only values belong in `.env.local`. Public production settings may use `.env.production`; for GitHub Pages, `VITE_API_BASE_URL` must point to the deployed API and the backend must allow the Pages origin in CORS.
