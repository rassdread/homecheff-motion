# Migration SQL

File: `prisma/migrations/20261019153000_studio_scene_dialogue_text/migration.sql`

```sql
ALTER TABLE "StudioScene" ADD COLUMN "dialogueText" TEXT;
```

`prisma migrate diff` from the previous schema to the current schema emits the same statement:

```sql
ALTER TABLE "StudioScene" ADD COLUMN "dialogueText" TEXT;
```

The migration file was written and reviewed. It was not applied.

The statement adds a nullable column. It does not set `NOT NULL`, does not set a default, and does not `UPDATE`, `DELETE`, or `DROP` anything.
