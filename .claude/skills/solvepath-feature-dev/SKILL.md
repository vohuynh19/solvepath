---
name: solvepath-feature-dev
description: Full-stack feature development skill for the Solvepath Nx monorepo. Use this skill when the user asks to build, implement, or add a feature to the Solvepath project. Extends the feature-dev workflow with project-specific conventions: Next.js App Router (client-side only), API routes, Prisma DB access via @solvepath/db, Zustand stores, react-query hooks, and axios. Replaces generic feature-dev for this codebase.
---

# Solvepath Feature Development

You are a senior full-stack engineer implementing features in the Solvepath Nx monorepo. Follow a rigorous, phased process. Never skip phases. Never implement before getting user approval on the architecture.

---

## Project Architecture (memorize this)

```
apps/
  web/      ← main user app (port 3000)
  admin/    ← admin dashboard (port 3001)
  landing/  ← marketing page (port 3002)
packages/
  ui/       ← shared React components → export from src/index.ts
  core/     ← business logic (GeometryEngine, domain services)
  db/       ← Prisma schema + singleton prisma client
```

### Non-negotiable conventions
- **All components are client-side**: every file using hooks or browser APIs must start with `'use client'`
- **No Server Components, no Server Actions** — ever
- **API calls go through axios** (`src/lib/axios.ts` in each app), never raw `fetch`
- **DB access only in API routes** — never import `@solvepath/db` in client components
- **State management**: Zustand for global/shared state, react-query for server state
- **Shared components** go in `packages/ui/src/`, exported from `packages/ui/src/index.ts`
- **Business logic** goes in `packages/core/src/`

---

## Phase 1: Clarify Business Logic

**Before any exploration**, understand what the feature should do:

Ask the user:
1. Which app(s) does this feature live in? (`web` / `admin` / `landing`)
2. What is the user journey? (step-by-step what the user does)
3. Does this require new DB models, or does it use existing ones?
4. Is there any admin-side counterpart to this feature?
5. What are the success/error states?

Summarize understanding and **wait for confirmation** before proceeding.

---

## Phase 2: Codebase Exploration

Launch 2-3 parallel `code-explorer` agents targeting:

- **Agent 1**: Existing similar features — trace API route → hook → component flow
- **Agent 2**: Relevant DB models in `packages/db/prisma/schema.prisma` and query patterns
- **Agent 3**: Existing Zustand stores and react-query hooks patterns

After agents complete, read all key files they identify. Produce a summary of:
- Existing patterns to follow
- Files to create vs modify
- Potential conflicts or dependencies

---

## Phase 3: Schema Design (if DB changes needed)

If the feature needs new or modified DB models, invoke the `postgres-prisma` skill:

1. Design entity map and relations
2. Write the Prisma schema additions
3. Identify required indexes
4. Show migration command
5. **Ask user to approve schema before continuing**

Do not proceed to implementation until schema is approved AND migrated.

---

## Phase 4: Architecture Design

Launch 2 parallel `code-architect` agents:

- **Agent A — Minimal path**: Reuse as much existing code as possible. Smallest diff.
- **Agent B — Clean architecture**: Proper separation of concerns, reusable abstractions.

Present both with trade-offs. Give your recommendation. **Wait for user choice.**

### Standard file layout for a new feature

```
apps/<app>/src/
  app/
    <feature>/
      page.tsx              ← 'use client' page
  app/api/
    <resource>/
      route.ts              ← API route (GET, POST, etc.)
      [id]/
        route.ts            ← API route for single resource
  hooks/
    use-<feature>.ts        ← react-query hook
  store/
    <feature>-store.ts      ← Zustand store (if needed)
  components/
    <feature>/
      <Component>.tsx       ← feature-specific UI

packages/
  ui/src/
    <SharedComponent>.tsx   ← only if reused across apps
  core/src/
    <domain-service>.ts     ← business logic, pure functions
```

---

## Phase 5: Implementation

**Wait for explicit user approval of architecture.**

Implement in this order to avoid import errors:

1. **DB schema + migration** (if needed) — `packages/db`
2. **Core logic** (if needed) — `packages/core`
3. **Shared UI components** (if needed) — `packages/ui`
4. **API routes** — `apps/<app>/src/app/api/`
5. **react-query hook** — `apps/<app>/src/hooks/`
6. **Zustand store** (if needed) — `apps/<app>/src/store/`
7. **Page / components** — `apps/<app>/src/app/` and `components/`

### API Route Template
```typescript
// apps/<app>/src/app/api/<resource>/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@solvepath/db';

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.<model>.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await prisma.<model>.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### react-query Hook Template
```typescript
// apps/<app>/src/hooks/use-<resource>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

interface <Model> {
  id: string;
  // ... fields
}

export function use<Model>s() {
  return useQuery({
    queryKey: ['<resource>'],
    queryFn: async () => {
      const { data } = await api.get<<Model>[]>('/<resource>');
      return data;
    },
  });
}

export function useCreate<Model>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<<Model>, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await api.post<<Model>>('/<resource>', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<resource>'] });
    },
  });
}
```

### Zustand Store Template
```typescript
// apps/<app>/src/store/<feature>-store.ts
import { create } from 'zustand';

interface <Feature>State {
  // state fields
  // actions
}

export const use<Feature>Store = create<<Feature>State>((set, get) => ({
  // initial state
  // action implementations
}));
```

### Client Component Template
```typescript
// apps/<app>/src/app/<feature>/page.tsx
'use client';

import { use<Model>s, useCreate<Model> } from '../../hooks/use-<resource>';
import { use<Feature>Store } from '../../store/<feature>-store';

export default function <Feature>Page() {
  const { data, isLoading, error } = use<Model>s();
  const { mutate: create, isPending } = useCreate<Model>();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <main>
      {/* feature UI */}
    </main>
  );
}
```

---

## Phase 6: Quality Review

Launch 3 parallel `code-reviewer` agents:

- **Reviewer 1**: Convention compliance — `'use client'`, no server components, axios usage, no direct fetch
- **Reviewer 2**: Bugs and correctness — null handling, error states, loading states, TypeScript types
- **Reviewer 3**: Code quality — DRY, no logic in components, proper separation of concerns

Only report issues with confidence ≥ 80. Present findings and ask user what to fix.

---

## Phase 7: Summary

After implementation:
1. List all files created/modified
2. Show the data flow: `User action → Component → Hook → axios → API route → Prisma → DB`
3. List any follow-up tasks (e.g., "add auth guard", "add pagination", "add optimistic updates")
4. Show how to test: which URL to visit, what to click

---

## Cross-cutting Rules (enforce throughout)

| Rule | Why |
|---|---|
| Never `import { prisma }` in a component | DB only in API routes |
| Never use `fetch()` directly | Use axios instance for interceptors |
| Always add `'use client'` to hook files | Hooks are client-only |
| Always add loading + error states | react-query provides both |
| Always invalidate queries after mutations | Keep UI in sync |
| Shared components → `packages/ui` | DRY across apps |
| Domain logic → `packages/core` | Testable, framework-agnostic |
