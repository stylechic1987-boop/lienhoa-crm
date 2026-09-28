# Liên Hoa CRM – Appwrite setup

Project: `6aad4a38001259030403`
Database: `6aad4a8f000133bdd644`

## Existing CRM table

`profiles` table ID: `6aad4c04002b2fdd8382`

Add these columns to `profiles` if they do not already exist:

| key | type | size | required |
|---|---|---:|---|
| full_name | varchar | 150 | yes |
| email | varchar | 255 | no |
| active | boolean | — | yes, default true |

Existing columns used by the app:
`user_id`, `role`, `branch`, `center`, `employee_id`.

## CRM lead tables

Create these three tables with the exact custom IDs below. Using stable custom IDs means no extra GitHub secrets are needed.

### 1. leads
Table ID: `leads`

Columns:
- `full_name` varchar 150, required
- `phone` varchar 30, optional
- `email` varchar 255, optional
- `course` varchar 150, optional
- `source` varchar 50, required
- `branch` varchar 100, optional
- `status` varchar 30, required
- `assigned_to` varchar 50, optional
- `created_by` varchar 50, optional
- `notes` text, optional
- `next_follow_up` datetime, optional

### 2. follow_ups
Table ID: `follow_ups`

Columns:
- `lead_id` varchar 50, required
- `assigned_to` varchar 50, required
- `due_at` datetime, required
- `status` varchar 20, required
- `note` text, optional

### 3. lead_activities
Table ID: `lead_activities`

Columns:
- `lead_id` varchar 50, required
- `actor_id` varchar 50, required
- `activity_type` varchar 30, required
- `content` text, optional

## Permissions for initial functional setup

For testing, grant authenticated users the table-level permissions needed by the CRM:
- profiles: READ; CREATE/UPDATE only if using the in-app staff administration
- leads: READ + CREATE + UPDATE
- follow_ups: READ + CREATE + UPDATE
- lead_activities: READ + CREATE

Do not grant guest/anonymous access.

For production hardening, replace broad authenticated-user write permissions with row/team permissions or Appwrite Functions. Appwrite permissions are enforced by the backend, so UI-only role checks are not sufficient for a security boundary.

## Web platform / CORS

Add a Web platform for the production GitHub Pages hostname:

`stylechic1987-boop.github.io`

Do not put the full `https://...` URL into the hostname field.

## Authentication

Create the first Appwrite Auth user in **Auth → Users**. Then add a corresponding `profiles` row:
- `user_id` = Appwrite User ID
- `full_name` = user's display name
- `email` = user's email
- `role` = `company_director`, `admin`, or `sale`
- `branch` = `Bắc Ninh` / `Lạng Sơn` as applicable
- `active` = true

The browser never receives an Appwrite API key.
