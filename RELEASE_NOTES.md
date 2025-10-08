# v0.2.0 Release Notes

## Features

- Next.js 15 (App Router) + TypeScript project scaffolding
- Dashboard with KPIs (APY, TVL) and PnL Line chart (Recharts)
- Global state for execution plan presets (Zustand)
- /api/health endpoint for basic health check

## Hardening

- ESLint (eslint-config-next) configured and passing
- Husky + lint-staged pre-commit: typecheck, tests, eslint --fix
- Vitest setup (jsdom) with path alias and React plugin
- Tailwind CSS v4 config with darkMode "class"

## UI

- shadcn/ui components (button, card, input, dialog, drawer, dropdown-menu, navigation-menu, sheet, tabs, tooltip, badge)
- Dark theme by default and ThemeToggle
- HealthBadge with live status from /api/health
- Dashboard shell with header and navigation

## Guardrails

- Configurable guardrails (LTV, slippage, HF) and feature flags via .env
- Semáforo LAV PLUS toggle with tooltip showing guardrail values

## Tests

- 3 unit tests (RTL + Vitest) covering KPI card, Presets drawer trigger, and PnL loading state

## Backup

- Full backup: ~/ADAF-Pro_v0.2.0.tgz
- Lean backup (excludes node_modules and .next): ~/ADAF-Pro_v0.2.0-lean.tgz

---

### How to run locally

- Dev server: npm run dev
- Tests: npm run test
- Typecheck: npm run typecheck
- Build: npm run build

### Notes

- CI workflow added for Node 20 + pnpm to install, typecheck, test, lint, and build.
- .gitignore/.dockerignore tuned to avoid committing env files or large artifacts (e.g., *.tgz).
