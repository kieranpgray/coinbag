# workspace-invites Edge Function

Handles workspace invitation create, resend, and accept.

## Routes (action in body)

- **create** – Create or resend invite (upsert for pending)
- **accept** – Accept invite by token

## Request format

All requests require `x-clerk-token` header with a valid Clerk JWT.

### Create / Resend

```json
{
  "action": "create",
  "workspace_id": "uuid",
  "email": "invitee@example.com",
  "role": "edit"
}
```

- `role` optional, defaults to `edit`. Valid: `admin`, `edit`, `read`
- If a pending invite exists for (workspace_id, email), it is updated (resend)
- Returns `Already a member` (409) if invitee is already a workspace member

### Accept

```json
{
  "action": "accept",
  "token": "invitation-token"
}
```

- User must be authenticated (JWT)
- User's verified email in Clerk must match the invite email
- Returns `Already a member` (409) if user is already a member

## Environment

- `SUPABASE_URL` – Supabase project URL
- `SUPABASE_ANON_KEY` – Supabase anon key
- `CLERK_SECRET_KEY` – Clerk secret key (for verified-email check and member lookup)

## Postgres dependency

Requires migration `20260226180000_workspace_invite_accept_function.sql` which creates
`accept_workspace_invitation(p_token, p_user_id)` (SECURITY DEFINER).
