# Settings

## Overview

The Settings module handles user account management: updating profile information (name, email, timezone), changing password, and permanently deleting the account with all associated data.

---

## Data Model

References `User` in `docs/database-schema.md`.

---

## Pages

| Route | Description |
|-------|-------------|
| `/settings` | Profile and security settings with account deletion option |

---

## Form Fields

### Profile

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | Display name |
| Email | Email | Yes | Must be unique. Changing email requires password confirmation |
| Timezone | Select | Yes | IANA timezone list. Default: Asia/Kolkata |

### Change Password

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Current password | Password | Yes | Verified against bcrypt hash |
| New password | Password | Yes | Min 8 characters |
| Confirm new password | Password | Yes | Must match new password |

### Account Deletion

A destructive action requiring explicit confirmation. No recovery possible.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Confirmation text | Text | Yes | User must type "DELETE" to enable the button |

---

## Business Rules

- Email changes require the user to re-authenticate (provide current password).
- Password changes invalidate all existing sessions — user is redirected to login.
- Account deletion is a cascade delete: all `DailyLog`, `WeeklyMetric`, `ComputedMetric`, `UserGoal`, and `User` records are permanently deleted. S3 progress photos are **not** automatically deleted (scheduled cleanup job, Phase 3).
- Timezone only affects display formatting of dates — all dates are stored in UTC.

---

## Components

| Component | Purpose |
|-----------|---------|
| `ProfileForm` | Name, email, timezone form |
| `PasswordForm` | Current + new + confirm password form |
| `DeleteAccountSection` | Confirmation input + destructive delete button |

---

## API Endpoints

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/settings/profile` | Get user profile | Authenticated |
| `PUT` | `/api/settings/profile` | Update name, email, timezone | Authenticated |
| `PUT` | `/api/settings/password` | Change password | Authenticated |
| `DELETE` | `/api/settings/account` | Delete account and all data | Authenticated |
