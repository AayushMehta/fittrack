# Spec: Settings

**Phase**: 3
**Routes**: `/settings`, `/api/settings/profile`, `/api/settings/password`, `/api/settings/account`
**Access**: Authenticated users only

**Files**:
- `src/app/(app)/settings/page.tsx` -- Server component; fetches profile via `getProfile`, passes to `SettingsClient`
- `src/app/(app)/settings/settings-client.tsx` -- Client component; profile form, password form, account deletion section
- `src/app/api/settings/profile/route.ts` -- API handler for GET (profile) and PUT (update profile)
- `src/app/api/settings/password/route.ts` -- API handler for PUT (change password)
- `src/app/api/settings/account/route.ts` -- API handler for DELETE (delete account)
- `src/lib/services/settings.ts` -- Service functions: `getProfile`, `updateProfile`, `updatePassword`, `deleteAccount`

---

## Overview

The Settings module handles user account management: viewing and updating profile information (name, timezone), changing password with current password verification, and permanently deleting the account with all associated data via cascade delete. Email is displayed but not editable in the current implementation.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| SET-1 | logged-in user | update my display name | my profile reflects my preferred name |
| SET-2 | logged-in user | update my timezone | dates are displayed in my local time |
| SET-3 | logged-in user | change my password | I can maintain account security |
| SET-4 | logged-in user | see my current email address | I know which account I am signed into |
| SET-5 | logged-in user | permanently delete my account and all data | I can exercise my right to data deletion |

---

## Happy Flow -- Updating Profile

1. User navigates to `/settings`
2. Server component fetches profile via `getProfile(userId)` returning name, email, timezone
3. Profile form pre-fills with current name and timezone; email shown as read-only text
4. User updates name field
5. User clicks "Save Profile"
6. Client sends PUT `/api/settings/profile` with `{ name, timezone }`
7. API validates via inline Zod schema, updates `User` record
8. Returns updated profile
9. Client shows success toast "Profile updated!" and refreshes page

## Happy Flow -- Changing Password

1. User fills in current password, new password (min 8 chars), and confirm new password
2. Client-side Zod validates passwords match via `.refine()`
3. Client sends PUT `/api/settings/password` with `{ currentPassword, newPassword }`
4. API validates via inline Zod schema, calls `updatePassword` service
5. Service verifies current password against bcrypt hash; if wrong, returns `{ success: false, error: "Current password is incorrect" }`
6. If correct, hashes new password and updates `User.password`
7. Returns success message
8. Client shows success toast "Password changed!" and resets form

## Happy Flow -- Deleting Account

1. User types "DELETE" in confirmation input
2. Delete button becomes enabled
3. User clicks "Delete My Account"
4. Client sends DELETE `/api/settings/account`
5. API calls `deleteAccount(userId)` which runs `db.user.delete` (cascade deletes all child records)
6. Returns `{ data: { deleted: true } }`
7. Client calls `signOut({ callbackUrl: '/login' })` to end session

---

## Form Fields

### Profile Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| name | string | Yes | `z.string().min(1, 'Name is required')` | Display name |
| timezone | string | Yes | `z.string().min(1)` | IANA timezone string; default "Asia/Kolkata" |

### Password Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| currentPassword | string | Yes | `z.string().min(1)` | Verified against bcrypt hash server-side |
| newPassword | string | Yes | `z.string().min(8, 'At least 8 characters')` | Min 8 characters |
| confirmPassword | string | Yes | `.refine(d => d.newPassword === d.confirmPassword)` | Must match newPassword; client-side only (not sent to API) |

### Account Deletion

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| deleteConfirm | string | Yes | Must equal "DELETE" exactly | Client-side only; enables the delete button |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| Profile is null (should not happen for authenticated user) | Client renders with empty defaults; name defaults to "", timezone to "Asia/Kolkata" |
| Name set to empty string | Client-side Zod rejects (`min(1)` on profileSchema); form shows "Name is required" error |
| Current password is incorrect | API returns 400 `{ "error": "Current password is incorrect" }`; client shows error toast |
| New password is fewer than 8 characters | Client-side Zod rejects; API-side Zod rejects with 400 |
| Confirm password does not match new password | Client-side Zod refinement shows "Passwords do not match" on confirmPassword field |
| User types "delete" (lowercase) in confirmation | Delete button remains disabled (exact match "DELETE" required) |
| User types "DELETE" then backspaces | Delete button re-disables |
| Unauthenticated request to GET /api/settings/profile | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to PUT /api/settings/profile | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to PUT /api/settings/password | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to DELETE /api/settings/account | Returns 401 `{ "error": "Unauthorized" }` |
| Account deletion cascades all data | All DailyLog, WeeklyMetric, ComputedMetric, UserGoal rows deleted via Prisma cascade |

---

## Acceptance Criteria

- [x] GET `/api/settings/profile` returns user profile with id, name, email, timezone, createdAt
- [x] PUT `/api/settings/profile` updates name and/or timezone; returns updated profile
- [x] PUT `/api/settings/password` verifies current password against bcrypt hash before updating
- [x] PUT `/api/settings/password` returns 400 with "Current password is incorrect" when verification fails
- [x] PUT `/api/settings/password` hashes new password with bcrypt (cost factor 12) before storing
- [x] DELETE `/api/settings/account` deletes the User row, cascading to all child records
- [x] All 4 API endpoints return 401 when no valid session
- [x] Zod validation rejects invalid input on PUT endpoints and returns 400
- [x] Email is displayed as read-only text, not an editable input
- [x] Delete button is disabled until user types exactly "DELETE" in confirmation input
- [x] After account deletion, client calls `signOut` to redirect to login page
- [x] After password change, form fields are reset to empty

---

## UI/UX

### Settings Page (`/settings`)

**Layout**: Single-column, `max-w-lg`, vertical stack with `space-y-6`. Heading "Settings" at top.

**Profile Card**: Card with "Profile" heading. Email shown as read-only text. Name and timezone as editable inputs. "Save Profile" button.

**Password Card**: Card with "Change Password" heading. Three password inputs: Current Password, New Password, Confirm New Password. "Update Password" button.

**Delete Account Card**: Card with destructive red border. "Delete Account" heading in red. Warning text: "Permanently deletes your account and all tracking data. This cannot be undone." Confirmation input with instruction to type "DELETE". Red "Delete My Account" button, disabled until confirmation matches.

**States**:
- **Submitting profile**: Button shows "Saving..."
- **Submitting password**: Button shows "Updating..."
- **Deleting**: Button shows "Deleting..."
- **Error**: Toast notification with error message

---

## Zod Schema

Schemas are defined inline in route handlers and the client component:

### Profile schema (`src/app/api/settings/profile/route.ts`)
```ts
const schema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
})
```

### Password schema (`src/app/api/settings/password/route.ts`)
```ts
const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})
```

### Client-side profile schema (`src/app/(app)/settings/settings-client.tsx`)
```ts
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  timezone: z.string().min(1),
})
```

### Client-side password schema (`src/app/(app)/settings/settings-client.tsx`)
```ts
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
```

---

## API Contract

### GET /api/settings/profile

**Purpose**: Get the authenticated user's profile information
**Auth**: Required (session)

**Response -- 200 OK**
```json
{
  "data": {
    "id": "cuid",
    "name": "Demo User",
    "email": "demo@fittrack.app",
    "timezone": "Asia/Kolkata",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### PUT /api/settings/profile

**Purpose**: Update the user's name and/or timezone
**Auth**: Required (session)

**Request**
```json
{
  "name": "Updated Name",
  "timezone": "America/New_York"
}
```

**Response -- 200 OK**
```json
{
  "data": {
    "id": "cuid",
    "name": "Updated Name",
    "email": "demo@fittrack.app",
    "timezone": "America/New_York"
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 400 | Zod validation failed | `{ "error": "Invalid input", "details": { ... } }` |

---

### PUT /api/settings/password

**Purpose**: Change the user's password (requires current password verification)
**Auth**: Required (session)

**Request**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Response -- 200 OK**
```json
{
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 400 | Zod validation failed | `{ "error": "Invalid input", "details": { ... } }` |
| 400 | Current password incorrect | `{ "error": "Current password is incorrect" }` |

---

### DELETE /api/settings/account

**Purpose**: Permanently delete the user's account and all associated data
**Auth**: Required (session)

**Response -- 200 OK**
```json
{
  "data": {
    "deleted": true
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

## Test Scenarios

### Unit Tests

No dedicated unit tests for settings logic.

Verified count = 0

### Service Tests

No dedicated service tests for `settings.ts`.

Verified count = 0

### API Tests

No dedicated API tests for settings routes.

Verified count = 0

### E2E Tests

No E2E tests (Playwright excluded).

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| Email editing | Feature doc says email changes require password confirmation; current implementation shows email as read-only | TBD |
| Session invalidation on password change | Feature doc says password changes invalidate all sessions and redirect to login; not implemented (form resets but session persists) | TBD |
| S3 progress photo cleanup on account deletion | Feature doc mentions scheduled cleanup; S3 skipped in simplified stack | N/A |
| IANA timezone select dropdown | Feature doc mentions timezone select; implemented as free-text input | TBD |
| Password confirmation required for email change | Feature doc specifies this; email is not editable in current implementation | TBD |
| Service-level and API-level tests | No test files for settings | TBD |
| Dedicated Zod schema file | Schemas are inline in route handlers and client; no shared `src/lib/validations/settings.ts` | TBD |

---

## Dependencies

- Phase 1 Layer 2 (Auth) must be complete -- session required for all endpoints
- `bcryptjs` library for password hashing and verification
- `next-auth/react` `signOut` function for post-deletion redirect
- Prisma cascade delete configured on all `User` relations
