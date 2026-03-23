# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Install dependencies
```bash
npm install
```

### Dev servers
```bash
npm run dev:web      # http://localhost:3000
npm run dev:admin    # http://localhost:3001
npm run dev:landing  # http://localhost:3002
# Or run all with Nx:
npx nx run-many --target=dev --parallel
```

### Build
```bash
npm run build                    # all apps
npx nx build web                 # single app
```

### Lint
```bash
npm run lint
npx nx lint web                  # single app
```

### Database (run from packages/db)
```bash
npm run db:generate   # prisma generate (after schema changes)
npm run db:migrate    # prisma migrate dev
npm run db:studio     # open Prisma Studio
```

### Environment
Copy `packages/db/.env.example` to `packages/db/.env` and set `DATABASE_URL`.

## Architecture

### Monorepo layout
```
apps/
  web/      - main user app (port 3000)
  admin/    - admin dashboard (port 3001)
  landing/  - marketing landing page (port 3002)
packages/
  ui/       - shared React components (Button, etc.)
  core/     - business logic (GeometryEngine placeholder)
  db/       - Prisma schema + singleton PrismaClient export
```

### Key conventions
- All apps are **fully client-side** — no Server Components, no Server Actions. Every component file must start with `'use client'` if it uses hooks or browser APIs. The layout files already include this.
- API calls from client components go through **axios** (`src/lib/axios.ts` in each app), not fetch directly. The base instance points to `/api` by default; override with `NEXT_PUBLIC_API_URL`.
- Server-side data access (e.g. in API routes) uses **`@solvepath/db`** which exports a singleton `prisma` client.
- State management uses **zustand** stores in `src/store/`. See `apps/web/src/store/app-store.ts` for the pattern.
- Data fetching uses **react-query** hooks in `src/hooks/`. The `QueryProvider` wraps each app's layout.
- Shared packages are referenced via TypeScript path aliases (`@solvepath/ui`, `@solvepath/core`, `@solvepath/db`) defined in `tsconfig.base.json`. Apps transpile them via `transpilePackages` in `next.config.js`.

### Adding a new API route
Create `src/app/api/<resource>/route.ts` in the relevant app. Import `prisma` from `@solvepath/db` for DB access.

### Adding a shared UI component
Add the component to `packages/ui/src/`, then export it from `packages/ui/src/index.ts`.

## Skills (`.claude/skills/`)

Two custom project skills are available and auto-load in this repo:

| Skill | Trigger |
|---|---|
| `postgres-prisma` | Ask to design/modify DB schema, add a model, write queries, run migrations |
| `solvepath-feature-dev` | Ask to build or implement any feature end-to-end |

`solvepath-feature-dev` extends the installed `feature-dev` plugin with project-specific conventions (client-only, axios, prisma patterns) and automatically invokes `postgres-prisma` when DB changes are needed.
