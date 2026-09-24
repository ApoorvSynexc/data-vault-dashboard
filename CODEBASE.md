# DataVault Frontend — Codebase Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Architecture Overview](#5-architecture-overview)
6. [Authentication & Permissions](#6-authentication--permissions)
7. [API Layer](#7-api-layer)
8. [Services](#8-services)
9. [Routing](#9-routing)
10. [Layouts & Navigation](#10-layouts--navigation)
11. [Module Breakdown](#11-module-breakdown)
12. [Shared Components](#12-shared-components)
13. [Key Patterns & Conventions](#13-key-patterns--conventions)
14. [Time & Date Formatting](#14-time--date-formatting)

---

## 1. Project Overview

DataVault is a data protection platform for CRM systems (primarily Salesforce). The frontend provides the UI for three core operations:

- **Backup Management** — create scheduled or real-time backup policies for CRM objects
- **Archive Vault** — define archival policies that move older data to cold storage
- **Restore Center** — restore data from a backup or archive to a target CRM org

Supporting modules handle connections (source CRM + destination cloud storage), storage reporting, notifications, and role-based access control.

---

## 2. Tech Stack

| Concern | Library / Version |
|---|---|
| UI Framework | React 19 |
| Language | TypeScript 5.9 |
| Build Tool | Vite 8 |
| Routing | React Router DOM 7 |
| Server State | TanStack React Query 5 |
| Client State | Redux Toolkit 2 |
| Styling | Tailwind CSS 4 |
| Date Handling | Day.js |
| Form Validation | Yup / Joi |
| CSV Parsing | PapaParse |
| Graph / Flow UI | @xyflow/react |

---

## 3. Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173 by default)
npm run dev

# Type-check without building
npx tsc --noEmit

# Production build
npm run build

# Lint
npm run lint
npm run lint:fix
```

The `BASE_URL` for the API is defined in `src/constants/index.ts`. Change that value to point the app at a different backend environment.

---

## 4. Project Structure

```
src/
├── assets/          # SVG icons and static images
├── components/      # Reusable UI components (shared across pages)
├── constants/       # App-wide constants (BASE_URL, enums, etc.)
├── context/         # React contexts (AuthContext)
├── hooks/           # Custom hooks (useHttpRequest, etc.)
├── layouts/         # Page shell — sidebar nav, top bar (MainLayout)
├── pages/           # Feature modules, one folder per page/module
│   ├── auth/              Login, ForgotPassword, SocialLoginCallback
│   ├── Dashboard/         Summary view across all modules
│   ├── BackupManagementV2/  Backup list + multi-step wizard
│   ├── ArchiveVault/      Archive list + multi-step wizard
│   ├── RestoreCenter/     Restore list + multi-step wizard
│   ├── Connections/       Source (Salesforce) + Destination (AWS) connections
│   ├── Storage/           Storage usage overview
│   ├── Settings/          Org and user settings
│   ├── Profile/           User profile
│   └── Notifications/     In-app notification centre
├── router/          # React Router configuration + route guards
├── services/        # API service hooks (one per backend domain)
├── utils/           # Pure utility functions (formatters, helpers)
└── validation/      # Yup/Joi schemas for multi-step forms
```

---

## 5. Architecture Overview

```
Browser
  └── React App (Vite)
        ├── AuthProvider          Loads user profile + permissions on mount
        ├── React Router          Handles page navigation + permission-based guards
        ├── MainLayout            Renders sidebar nav + <Outlet />
        └── Pages
              └── useQuery / useMutation (TanStack Query)
                    └── Service hooks (useBackupConfigService, etc.)
                          └── HttpRequestInstance (src/services/api.ts)
                                └── Backend REST API (BASE_URL)
```

All API calls go through the single `HttpRequestInstance` defined in `src/services/api.ts`. It handles:
- Automatic JSON serialisation
- `x-crm-userid` / `x-crm-orgid` headers (which CRM org the user is acting on behalf of)
- Silent 401 → token refresh → request retry
- Logout callback when refresh itself fails

---

## 6. Authentication & Permissions

### Auth Context (`src/context/AuthContext.tsx`)

The `AuthProvider` wraps the entire app. On mount it calls `GET /v1/user/my-profile` and stores the result. Everything else in the app reads from this context via `useAuth()`.

```ts
const { user, permissions, hasPermission, logout, refreshProfile } = useAuth();
```

| Value | Type | Purpose |
|---|---|---|
| `user` | `Record<string, unknown>` | Raw profile object from the API |
| `permissions` | `string[]` | Flat list of permission strings e.g. `backup.write`, `restore.read` |
| `hasPermission(prefix)` | `(string) => boolean` | Returns true if any permission starts with `prefix` |
| `crmUserId` / `crmOrgId` | `string` | Currently selected CRM org — injected into every API request as headers |

### Permission Strings

Permissions follow a `resource.action` pattern. Common values:

| String | Meaning |
|---|---|
| `backup.read` | Can view backup policies |
| `backup.write` | Can create / edit / delete backup policies |
| `archival.read` | Can view archive policies |
| `archival.write` | Can create / edit archive policies |
| `restore.read` | Can view restore jobs |
| `restore.write` | Can create restore jobs |
| `sourceConnection` | Can manage Salesforce source connections |
| `destinationConnection` | Can manage AWS destination connections |
| `settings` | Can access Settings |
| `dashboard` | Can access Dashboard |

### Checking Permissions in a Component

```tsx
import { useAuth } from '../../context/AuthContext';

const { permissions } = useAuth();

// Simple write check
const canWrite = permissions.includes('backup.write');

// Using hasPermission (prefix match — covers both 'backup' and 'backup.read')
const { hasPermission } = useAuth();
if (hasPermission('backup')) { ... }
```

### PermissionGate Component

For wrapping JSX elements that should only appear for users with a given permission:

```tsx
import PermissionGate from '../../components/PermissionGate';

<PermissionGate permission='backup.write'>
  <button>New Backup</button>
</PermissionGate>
```

---

## 7. API Layer

**File:** `src/services/api.ts`

All HTTP calls go through `createHttpRequest()` which returns an `HttpRequestInstance`. The singleton instance exported as `httpRequest` is used by most service hooks.

### Request Flow

1. `buildPath()` serialises query params into the URL
2. Headers `x-crm-userid` and `x-crm-orgid` are injected from `AuthContext` module-level refs (`getCrmUserIdForRequest()` / `getCrmOrgIdForRequest()`)
3. All requests send `credentials: 'include'` (cookie-based session)
4. On 401 the client attempts a token refresh at `/v1/auth/refresh-token`. If that succeeds, the original request is retried once. If it fails, `onLogout()` is called and an `HttpError(401)` is thrown
5. Non-2xx responses or `envelope.success === false` throw `HttpError`

### ApiResponse Shape

Every API endpoint returns:

```ts
{
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, unknown>;  // pagination cursors, counts, etc.
}
```

---

## 8. Services

Each backend domain has its own service file in `src/services/`. Services are hooks (not classes) so they can call `useHttpRequest()` which injects the correct CRM org headers.

| Service file | Domain | Key methods |
|---|---|---|
| `auth.service.ts` | Login / logout / token refresh | `login()`, `logout()` |
| `user.service.ts` | User profile | `getMyProfile()` |
| `backup-config.service.ts` | Backup policies | `listBackupConfigs()`, `createBackupConfig()`, `updateBackupConfig()`, `runNow()`, `pauseBackup()` |
| `archival.service.ts` | Archive policies | `getList()`, `createArchive()`, `updateArchive()` |
| `restore.service.ts` | Restore jobs | `listRestoreJobs()`, `createRestoreJob()` |
| `destination.service.ts` | AWS cloud storage connections | `listDestinations()`, `createDestination()`, `getDecryptedConfig()` |
| `platform.service.ts` | Connected Salesforce orgs | `getPlatforms()` |
| `crm-metadata.service.ts` | Salesforce schema (objects, fields) | `getObjects()`, `getFields()` |
| `storage.service.ts` | Storage usage stats | `getStorageStats()` |
| `notification.service.ts` | In-app notifications | `getNotifications()`, `markAsRead()` |
| `settings.service.ts` | Org / user settings | `getSettings()`, `updateSettings()` |

### Usage Pattern

```ts
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';

function MyComponent() {
  const backupConfigService = useBackupConfigService();

  const { data } = useQuery({
    queryKey: ['backup-list'],
    queryFn: () => backupConfigService.listBackupConfigs(),
  });
}
```

---

## 9. Routing

**File:** `src/router/index.tsx`

Routes are split into two groups:

- **Protected routes** — wrapped in `<ProtectedRoute>`. If the user is unauthenticated, they are redirected to `/login`.
- **Public routes** — wrapped in `<PublicRoute>`. If the user is already authenticated, they are redirected away from login/signup pages.

### Permission-Based Route Guard

`PermissionRoute` wraps any route that requires a specific module permission. If the user lacks the permission, they are redirected to the first module they _do_ have access to (determined by `NAV_PERMISSION_ORDER`).

```tsx
{ path: '/backup-management', element: <PermissionRoute permissions={['backup']}><BackupManagementV2 /></PermissionRoute> }
```

### Route Map

| Path | Component | Permission Required |
|---|---|---|
| `/dashboard` | Dashboard | `dashboard` |
| `/backup-management` | BackupManagementV2 | `backup` |
| `/backup-management/add` | AddBackup | `backup` |
| `/backup-management-v2/details/:slug` | BackupDetails | `backup` |
| `/archive-vault` | ArchiveVault | `archival` |
| `/archive-vault/new` | AddArchive | `archival` |
| `/archive-vault/edit/:slug` | EditArchive | `archival` |
| `/archive-vault/:slug` | ArchiveDetailScreen | `archival` |
| `/restore-center` | RestoreCenter | `restore` |
| `/connections` | Connectors | `sourceConnection` or `destinationConnection` |
| `/connections/salesforce` | SalesforceConnections | `sourceConnection` |
| `/connections/aws` | AWSConnections | `destinationConnection` |
| `/storage` | Storage | `storage` |
| `/settings` | Settings | `settings` |
| `/profile` | Profile | _(authenticated)_ |
| `/notifications` | Notifications | _(authenticated)_ |

---

## 10. Layouts & Navigation

**File:** `src/layouts/MainLayout.tsx`

`MainLayout` renders the persistent sidebar and top navigation bar. Child pages are rendered inside `<Outlet />`.

The sidebar nav items (`mainNav`) are filtered by the user's permissions — a nav item only shows if `hasPermission()` returns true for at least one of its listed permission prefixes.

### OrgContext

`MainLayout` also provides `OrgContext` — the currently-selected Salesforce org (from the org switcher dropdown in the header). Pages that need the selected org import `useSelectedOrg()`:

```ts
import { useSelectedOrg } from '../../layouts/MainLayout';
const { selectedOrg } = useSelectedOrg();
```

---

## 11. Module Breakdown

### Backup Management (`src/pages/BackupManagementV2/`)

The primary module. The list page (`index.tsx`) shows all backup configs for the selected org with status, schedule type, and last-run info. A pause/resume action is available inline.

**Add Backup Wizard** (`AddBackup/`) — 6 or 7 steps depending on backup type:

| Step | File | Purpose |
|---|---|---|
| 1 | `Step1.tsx` | Choose strategy: Real-time or Scheduled |
| 2 | `Step2.tsx` | Select Salesforce source connection + AWS destination |
| 3 | `Step3.tsx` | Define policy name (150 char limit, duplicate check) and description |
| 4 | `Step4.tsx` | Select Salesforce objects to back up |
| 5 | `Step5.tsx` | Review selected objects and record counts |
| 6 | `Step6.tsx` | Configure schedule (frequency, timezone, time window) |
| FinalStep | `FinalStep.tsx` | Final review + submit |

**Backup Details** (`BackupDetails/`) — tabbed detail page for a single backup config:
- **Overview** — key metrics and config summary
- **Backup History** — paginated list of past backup jobs with a detail modal
- **Objects & Data** — objects included in the backup
- **Trigger Records** — records included per trigger event

---

### Archive Vault (`src/pages/ArchiveVault/`)

Manages archival policies — configurations that move aged CRM data to cold/archive storage.

**Add Archive Wizard** (`AddArchive/`) — 6 steps:

| Step | Folder | Purpose |
|---|---|---|
| 1 | `SourceDestination/` | Select Salesforce source + AWS destination |
| 2 | `DefineArchive/` | Policy name (150 char, duplicate check) + description |
| 3 | `SelectObjects/` | Choose CRM objects + configure per-object archive rules |
| 4 | `Schedule/` | Configure archive schedule |
| 5 | `DryRun/` | Preview how many records will be archived |
| 6 | `Review/` | Final review + submit |

**Archive Detail Screen** (`DetailScreen/`) — shows archive job runs and a modal with per-run details.

---

### Restore Center (`src/pages/RestoreCenter/`)

Manages data restore jobs from backup or archive sources.

**New Restore Wizard** (`NewRestore/`) — 8 steps:

| Step | Folder | Purpose |
|---|---|---|
| 1 | `SelectSource/` | Choose the Salesforce source connection to restore to |
| 2 | `SelectSourceType/` | Choose whether to restore from Backup or Archive, and pick the specific config |
| 3 | `SelectScope/` | Choose what to restore (entire backup, specific objects, specific records) |
| 4 | `SetDestination/` | Choose the target Salesforce org |
| 5 | `DefineRestorePolicy/` | Name the restore job and add description |
| 6 | `ConflictConfig/` | Configure how to handle record conflicts (overwrite, skip, etc.) |
| 7 | `PreviewValidate/` | Preview the restore impact before submitting |
| 8 | `ReviewSubmit/` | Final review + submit |

The `SelectSourceType` step filters the backup/archive config list by the `destinationId` of the cloud connection the user selected in step 1, so only configs linked to that destination are shown.

---

### Connections (`src/pages/Connections/`)

Manages two types of connections:

- **Source connections** (`source/SalesforceConnections.tsx`) — Salesforce orgs connected via OAuth. Adding a new connection opens a Salesforce OAuth popup.
- **Destination connections** (`destination/AWSConnections.tsx`) — AWS S3 buckets. Connect, edit (re-enter credentials), and delete.

---

### Dashboard (`src/pages/Dashboard/DashboardV2.tsx`)

Summary tiles showing counts and recent activity across backup, archive, and restore. The "New Backup / Archive / Restore" quick-action buttons are gated by `backup.write`, `archival.write`, and `restore.write` permissions respectively.

---

## 12. Shared Components

| Component | Location | Purpose |
|---|---|---|
| `Table` | `components/Table/` | Reusable data table with skeleton loading, pagination (cursor + offset), row click, configurable columns |
| `PermissionGate` | `components/PermissionGate/` | Conditionally renders children based on a permission string |
| `SmartSelect` | `components/SmartSelect/` | Viewport-aware custom dropdown that flips up/down to avoid screen edge clipping. Drop-in replacement for `<select>` |
| `InfoTooltip` | `components/InfoTooltip/` | Small `?` icon with a hover tooltip |
| `Typography` | `components/Typography/` | Typed text component with `variant` and `color` props |
| `WarningDialog` | `components/WarningDialog/` | Confirmation dialog for destructive actions |
| `Button` | `components/Button/` | Base button with variant styles |
| `HierarchyGraph` | `components/HierarchyGraph/` | @xyflow/react-based diagram for visualising object relationships |

---

## 13. Key Patterns & Conventions

### React Query for All API Calls

All read operations use `useQuery`. Write operations use `useMutation`. Query keys always include any filter/cursor state so the cache invalidates correctly when filters change:

```ts
useQuery({
  queryKey: ['backup-list', cursor, search, destinationId],
  queryFn: () => backupConfigService.listBackupConfigs(true, cursor, search, undefined, undefined, undefined, destinationId),
});
```

### Cursor-Based Pagination

List APIs use cursor pagination. Pages maintain:
- `currentCursor` — the cursor for the current page
- `cursorStack` — stack of previous-page cursors (for the Back button)
- `currentPage` — display-only page number

### Duplicate Name Check Pattern

Policy name fields (Backup Step3, Archive DefineArchive) perform a duplicate check on blur:

1. User types a name and tabs away / clicks elsewhere → `onBlur` fires
2. API is called with the name as a search filter
3. If any result is an exact case-insensitive match → an error is displayed
4. The Next button shows a spinner + "Checking…" label while the check is in progress
5. Network errors are silently swallowed — they do not block the user (the backend will catch the duplicate on submit)

A `lastCheckedName` ref prevents redundant API calls if the user blurs the same unchanged value multiple times.

### Permission Gating

- **Routes** — `<PermissionRoute permissions={[...]}>` in `router/index.tsx`
- **Nav items** — filtered in `MainLayout.tsx` by `hasPermission()`
- **Buttons / UI elements** — inline `{permissions.includes('x.write') && <button>}` or `<PermissionGate>`
- Write-only buttons (Add, Create, Edit, Delete) always require the `.write` permission string

### Service Hook Pattern

Services are not classes. They are hooks that return an object of async functions:

```ts
export function useBackupConfigService() {
  const api = useHttpRequest();
  return {
    listBackupConfigs: (active?: boolean, cursor?: string, ...) =>
      api.get(BACKUP_CONFIG_ENDPOINTS.list, { query: { active, cursor, ... } }),
    ...
  };
}
```

This lets them access the authenticated HTTP instance that carries the current CRM org headers.

### Multi-Step Wizard Pattern

Each wizard (AddBackup, AddArchive, NewRestore) uses a parent index component (`index.tsx`) that:
1. Holds all wizard state in `useState` 
2. Renders the active step component based on a `step` counter
3. Passes `onNext` and `onBack` callbacks to each step
4. Each step only receives the slice of state it needs + fires `onNext(stepData)` when done

The parent assembles the final payload from all collected step data and submits it on the last step.

---

## 14. Time & Date Formatting

All time display throughout the app uses **24-hour format**. Input elements (`<input type="time">`) store values in `HH:mm` natively.

### Utility Functions (`src/utils/index.ts`)

| Function | Input | Output | Notes |
|---|---|---|---|
| `formatTime(iso)` | ISO date string | `"14:30"` | 24-hour time only |
| `formatDateTime(iso)` | ISO date string | `"Sep 24, 2026 14:30"` | 24-hour time |
| `formatBytes(bytes)` | Number | `"1.4 MB"` | Human-readable file size |
| `to24h(timeStr)` | `"2:30 PM"` | `"14:30"` | Converts API-returned 12h strings to 24h for display |

When calling `toLocaleTimeString()` directly, always pass `{ hour12: false }`:

```ts
d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
```

When using Day.js, use `HH:mm` (24h) not `hh:mm A` (12h):

```ts
dayjs(value).format('MMMM D, YYYY | HH:mm')
```

---

*For questions about specific APIs or backend contracts, refer to the backend team's API documentation or check the endpoint constants in each service file (e.g. `BACKUP_CONFIG_ENDPOINTS` in `backup-config.service.ts`).*
