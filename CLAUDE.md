# CLAUDE.md

Project-specific instructions for Claude Code when working in this repository.

## Terminology: "inject"

When the user asks to **"create an inject"** (or "inject [data/property] for X"), they mean: create a **seed data file** — a SQL script that populates a lookup/reference table with starter data for a fresh server setup. It is not a schema change and not an ad-hoc one-off data fix; it's a checked-in, reusable, idempotent seed.

## Seed data convention (`backend/database/seed/`)

- One file per seed, named `<NNN>_seed_<table_or_topic>.sql`. Number sequentially from the highest existing number already in `backend/database/seed/` — this sequence is **independent** from `backend/database/schema/NNN_*.sql`'s numbering, so check both directories but only the seed folder's own max matters for the next number.
- **Always idempotent** — safe to re-run against a database that already has the data (e.g. because someone seeded it by hand first, or a prior deploy already ran it). Two patterns, pick based on the target table:
  - **Simple lookup table with a UNIQUE column** (e.g. `name` or `code`) — the default case:
    ```sql
    INSERT IGNORE INTO <table> (name, description, created_at) VALUES
    ('...', '...', NOW()),
    ('...', '...', NOW());
    ```
    Reference: `backend/database/seed/012_seed_discharge_dispositions.sql`, `backend/database/seed/013_seed_cvx_codes.sql`, `backend/database/seed/014_seed_screening_tools.sql`.
  - **Rows that need to reference other seeded/looked-up rows** (e.g. creating a user that belongs to a role and a department, none of which may exist yet) — use `INSERT ... SELECT ... WHERE NOT EXISTS (...)` per row, chained with `SET @var = (SELECT id FROM ... WHERE ...)` between inserts. Reference: `backend/database/seed/007_seed_admin.sql`.
- Header comment block at the top of every seed file: `-- Seed: <short name>` plus a one-line description of what it seeds and which idempotency mechanism it relies on.
- Seeds are **not auto-run** by any script — there is no migration runner in this project (same as schema files). After writing a seed file, also apply it directly to whichever database is currently live: `mysql -h<host> -P<port> -u<user> -p<password> <database> < backend/database/seed/NNN_seed_x.sql`. Connection details are in `backend/.env` (`DB_HOST`/`DB_PORT`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD`) — the app's real database is a remote host, not the local XAMPP MySQL instance, so don't seed the local one and call it done.
- A written-but-unapplied seed file is not finished work — always apply it and verify the rows landed (`SELECT` the table back) before considering the task complete.
