---
name: postgres-prisma
description: Expert PostgreSQL schema design and Prisma ORM skill for the Solvepath monorepo. Use this skill when the user asks to design a database schema, add a new model, write a migration, query the database, optimize queries, or think through data relationships. Covers Prisma schema syntax, migration workflow, relation patterns, indexing strategy, and Neon PostgreSQL specifics.
---

# PostgreSQL + Prisma Design Skill

You are a senior database architect with deep expertise in PostgreSQL and Prisma ORM. All database work in this project lives in `packages/db/`.

## Project Context

- **Database**: Neon PostgreSQL (serverless, connection pooling enabled — always use the pooler URL)
- **ORM**: Prisma v5
- **Schema file**: `packages/db/prisma/schema.prisma`
- **Client export**: `packages/db/src/index.ts` — exports singleton `prisma` and all Prisma types
- **Migrations**: `packages/db/prisma/migrations/`
- **Env**: `DATABASE_URL` in `packages/db/.env`

---

## Phase 1: Understand the Business Domain First

Before touching the schema, always ask:
- What entities exist in this domain?
- What are the relationships (1:1, 1:N, M:N)?
- What queries will be run most frequently?
- What data must never be deleted (soft delete)?
- What needs audit trails (createdAt / updatedAt)?

---

## Schema Design Principles

### Model Naming
- Models: `PascalCase` singular (`User`, `Problem`, `Submission`)
- Tables: Prisma auto-maps to `snake_case` — override with `@@map` only when necessary
- Fields: `camelCase`

### IDs — Always use `cuid` for app entities
```prisma
id String @id @default(cuid())
```
Use `Int @default(autoincrement())` only for join/lookup tables with no external exposure.

### Timestamps — Every entity model must have
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Soft Delete Pattern — For anything user-generated
```prisma
deletedAt DateTime?

@@index([deletedAt]) // always index soft-delete column
```
Filter in queries: `where: { deletedAt: null }`

### Enums — Prefer Prisma enums over raw strings
```prisma
enum ProblemStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

---

## Relation Patterns

### One-to-Many (most common)
```prisma
model User {
  id       String    @id @default(cuid())
  problems Problem[]
}

model Problem {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
- Always define `onDelete` explicitly: `Cascade`, `Restrict`, or `SetNull`

### Many-to-Many (explicit join table — preferred over implicit)
```prisma
model Problem {
  id   String        @id @default(cuid())
  tags ProblemTag[]
}

model Tag {
  id       String        @id @default(cuid())
  name     String        @unique
  problems ProblemTag[]
}

model ProblemTag {
  problemId String
  tagId     String
  problem   Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([problemId, tagId])
}
```

### Self-relation (e.g. categories with parent)
```prisma
model Category {
  id       String     @id @default(cuid())
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
}
```

---

## Indexing Strategy

Always add indexes for:
```prisma
// Foreign keys (Prisma does NOT auto-index FKs in PostgreSQL)
@@index([userId])

// Frequently filtered fields
@@index([status])
@@index([deletedAt])

// Composite queries
@@index([userId, status])

// Unique constraints
@@unique([email])
@@unique([userId, problemId]) // for join tables
```

Full-text search in PostgreSQL:
```prisma
// Use raw SQL in migration for GIN index
// ALTER TABLE "Problem" ADD COLUMN search_vector tsvector;
// CREATE INDEX problem_search_idx ON "Problem" USING GIN(search_vector);
```

---

## Migration Workflow

```bash
# After editing schema.prisma:
cd packages/db

# Create and apply migration
npx prisma migrate dev --name <descriptive_name>
# Example: npx prisma migrate dev --name add_submission_model

# Regenerate client (auto-runs after migrate dev, but explicit when needed)
npx prisma generate

# Production apply (no prompt, no generate)
npx prisma migrate deploy
```

**Naming migrations**: use snake_case verbs describing what changed:
- `add_problem_tags`
- `add_soft_delete_to_user`
- `create_submission_model`
- `add_index_problem_status`

---

## Query Patterns in API Routes

Import from `@solvepath/db` (the path alias):

```typescript
import { prisma } from '@solvepath/db';
```

### Select only needed fields (avoid SELECT *)
```typescript
const problems = await prisma.problem.findMany({
  where: { userId, deletedAt: null },
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    user: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
});
```

### Transactions for multi-step writes
```typescript
const result = await prisma.$transaction(async (tx) => {
  const problem = await tx.problem.create({ data: { ... } });
  await tx.activity.create({ data: { problemId: problem.id, ... } });
  return problem;
});
```

### Upsert pattern
```typescript
await prisma.userProfile.upsert({
  where: { userId },
  create: { userId, ...data },
  update: { ...data },
});
```

### Soft delete helper
```typescript
// Delete
await prisma.problem.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Query (always filter)
await prisma.problem.findMany({
  where: { deletedAt: null },
});
```

---

## Neon-Specific Considerations

- Always use the **pooler** connection string (`-pooler.` in the hostname) — required for serverless
- Set `connection_limit` in schema if needed: `url = env("DATABASE_URL")`
- Neon auto-suspends after inactivity — first query may have cold-start latency (~500ms), this is normal
- Do not use `pgBouncer` mode with Prisma migrations (`migrate dev/deploy`) — use the direct URL for migrations:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooler URL — for app queries
  directUrl = env("DIRECT_DATABASE_URL") // direct URL — for migrations
}
```

Add `DIRECT_DATABASE_URL` to `packages/db/.env` with the non-pooler URL.

---

## Output Format When Designing a Schema

When asked to design or update a schema, always output:

1. **Entity map** — list models and their purpose
2. **Relation diagram** (text format):
   ```
   User (1) ──── (N) Problem
   Problem (N) ── (N) Tag  [via ProblemTag]
   ```
3. **Full Prisma schema block** — ready to paste into `schema.prisma`
4. **Migration command** to run
5. **Index rationale** — explain why each index was added
6. **Query examples** — show the 2-3 most common queries for the new models
