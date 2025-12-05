# DATABASE & DATA MANAGEMENT (questions 30–37)

This document answers questions about the project's database schema, relationships, date/time storage, keys, indexes, SQL example, SQL injection protections, and migration approach. All content references SQL files in `database/` and related service code in the repo.

30. Can you explain your database schema? What are the main tables?

- The database is centered around user profiles, hall metadata and the smart booking system. Main tables include:
  - `auth.users` (provided by Supabase/Auth) — holds authentication identities.
  - `public.profiles` — application user profiles linked to `auth.users` (see `database/super_admin_setup.sql`).
  - `public.halls` — hall metadata, capacity, equipment, maintenance flags (see `database/hall_management_schema.sql`).
  - `smart_bookings` — the core booking table with date/time, buffers, status and admin fields (see `database/smart_booking_schema.sql`).
  - `public.notifications` — user notifications.
  - `public.user_activity_log` — audit/activity log.
  - Supporting objects: `push_tokens`, `user_notification_settings`, `email_logs`, and various helper functions/views (e.g., `booking_details` view, conflict-check functions).

31. What is the relationship between `profiles`, `halls`, and `smart_bookings` tables?

- `profiles` store user information and map 1:1 to `auth.users` via `profiles.id` which references `auth.users(id)`.
- `halls` stores the rooms/halls available for booking. `halls.id` is the primary key.
- `smart_bookings` references both:
  - `user_id` (UUID) -> `auth.users(id)` (the booking owner / profile) and
  - `hall_id` (UUID) -> `halls(id)` (the hall being booked).

This makes `smart_bookings` effectively a join between `profiles`/`auth.users` and `halls` for scheduling data; the `booking_details` view joins `smart_bookings`, `halls` and `profiles` to provide enriched booking rows.

32. How do you store dates and times in the database? Why that format?

- `booking_date` is stored as `VARCHAR(8)` in DDMMYYYY format (e.g., `12072025`). Start/end and buffer times are stored as `VARCHAR(5)` in HH:MM (24-hour) format. Timestamps for created/updated use `TIMESTAMPTZ`.

- Why this format:
  - DDMMYYYY as an 8‑char string simplifies certain text-based queries and indexing for the booking use-case and avoids timezone surprises when only a date (not a moment) is required. The repo provides utility SQL to convert to `DATE` when needed (e.g., `TO_DATE(booking_date, 'DDMMYYYY')` in the `booking_details` view).
  - Time as `HH:MM` string is human-readable and easy to validate with CHECK constraints; the application converts these to `TIME` when performing arithmetic (the schema and functions compute durations by casting to `TIME`).

33. What primary and foreign keys have you defined?

- Primary keys (representative):

  - `profiles.id` — `UUID PRIMARY KEY` referencing `auth.users(id)`.
  - `halls.id` — `UUID PRIMARY KEY` (see `hall_management_schema.sql`).
  - `smart_bookings.id` — `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
  - `notifications.id`, `user_activity_log.id` — UUID primary keys (often using `uuid_generate_v4()` or `gen_random_uuid()`).

- Foreign keys (representative):
  - `profiles.id` REFERENCES `auth.users(id)` ON DELETE CASCADE.
  - `smart_bookings.user_id` REFERENCES `auth.users(id)` ON DELETE CASCADE.
  - `smart_bookings.hall_id` REFERENCES `halls(id)` ON DELETE CASCADE.
  - `smart_bookings.approved_by` REFERENCES `auth.users(id)` (nullable).
  - `notifications.user_id` REFERENCES `auth.users(id)` ON DELETE CASCADE.
  - `halls.created_by` / `updated_by` reference `auth.users(id)` where present.

34. Show me a SQL query to fetch all bookings for a specific hall on a particular date.

- Using the `booking_details` view (preferred because it includes hall and user info):

```sql
-- Parameterized / prepared-style (Postgres positional parameters)
SELECT *
FROM booking_details
WHERE hall_id = $1
  AND booking_date = $2
ORDER BY start_time ASC;

-- Example values: $1 = '11111111-2222-3333-4444-555555555555', $2 = '12072025'
```

- Equivalent using Supabase JS client (safe parameterization done by client):

```ts
const { data, error } = await supabase
	.from("booking_details")
	.select("*")
	.eq("hall_id", hallId)
	.eq("booking_date", bookingDate)
	.order("start_time", { ascending: true });
```

35. How do you prevent SQL injection in your queries?

- Techniques used in the repo:
  - Use the Supabase JS client (`@supabase/supabase-js`) which parameterizes queries when you use the client API (`.eq()`, `.insert()`, `.update()`, `.rpc()`), avoiding raw string concatenation.
  - Server-side functions (PL/pgSQL) accept typed parameters and run inside the DB, reducing injection risk when called via RPC.
  - RLS policies and stored procedures enforce authorization server-side; even if a client sent an unexpected query, RLS blocks unauthorized access.
  - SQL scripts and migrations use `CREATE OR REPLACE`, `DO $$ ... $$` blocks, and parameterized Postgres functions rather than building SQL strings in application code.

36. What indexes have you created for performance optimization?

- The schema creates several indexes (see `database/smart_booking_schema.sql` and related SQL scripts):
  - `idx_smart_bookings_hall_date` ON `(hall_id, booking_date)` — speeds up hall+date lookups.
  - `idx_smart_bookings_date_time` ON `(booking_date, start_time)` — helps ordering and date/time range queries.
  - `idx_smart_bookings_user_status` ON `(user_id, status)` — for user-specific dashboards and filters.
  - `idx_smart_bookings_status` — for queries filtering by status.
  - `idx_smart_bookings_buffer_times` ON `(hall_id, booking_date, buffer_start, buffer_end)` — used by conflict-check functions.
  - Additional indexes in other scripts include `idx_profiles_role_active` on `(role, is_active)`, `idx_profiles_email`, and notification/push token indexes for efficient lookups.

37. How do you handle database migrations when schema changes?

- Migration approach used in the project:
  - SQL-first scripts kept in the `database/` directory. Each change is represented by an idempotent SQL file (many use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` or `CREATE OR REPLACE FUNCTION`) so scripts can be re-run safely.
  - Several migration/summary docs (e.g., `SMART_BOOKINGS_MIGRATION.md`, `DATABASE_SCHEMA_FIX.md`) document intent and steps.
  - The `hall_management_schema.sql` contains `DO $$ ... $$` blocks to add missing columns conditionally (safe in-place migrations without destructive type changes).
  - Recommended deployment flow (documented in `TESTING_GUIDE.md` and other docs): run the SQL scripts in your Supabase SQL editor in the prescribed order, test, then update the client code. Some changes (type conversions) require explicit data migration and are documented where needed.

Notes / Recommendations:

- For a more structured migration process consider adding a migration tool (like `sqitch`, `pg-migrate`, or GitHub Actions that run versioned scripts) to ensure ordered, repeatable deployments across environments.
- Avoid destructive column type changes without a data migration plan (the repo already avoids automatic type changes where data could be lost).

---

Last updated: 2025-12-05
