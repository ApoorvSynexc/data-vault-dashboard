# Archive Vault — End-to-End User Flow

---

## What Is Archive Vault?

Archive Vault lets you move Salesforce records that are old, inactive, or no longer needed out of Salesforce and into a cloud storage destination (AWS S3) — with permanently deleting them from salesforce and keeping them on cloud. Records are always restorable. The vault runs on a schedule you define, so archiving happens automatically without manual intervention.

---

## Step-by-Step Flow

---

### Step 1 — Source & Destination

**What the user does:**
- Selects a **Salesforce CRM connection** as the source (the org records will be pulled from).
- Selects a **cloud storage destination** (e.g. an AWS S3 bucket) where archived records will be stored.

**Rules:**
- Both source and destination must be connected and available before proceeding.
- The selected CRM ID is carried through every subsequent API call.

---

### Step 2 — Define Archive

**What the user does:**
- Enters an **Archive Policy Name** — a human-readable label for this archive job.
- Optionally adds a **Description** explaining the purpose of this archive.

**Rules:**
- Policy name is required to proceed.

---

### Step 3 — Select Objects & Configure Filters

This is the most detailed step. It has three sub-parts:

---

#### 3a — Object Selection

**What the user does:**
- Browses a list of Salesforce objects fetched from the connected CRM.
- Selects one or more objects to include in the archive.

**Rules:**
- Only objects that are **queryable**, **accessible**, and **deletable** in Salesforce are shown. Objects missing any of these permissions are hidden.
- The user must select at least one object to proceed.

---

#### 3b — Filter Configuration (per object)

After selecting objects, the user must configure a filter for **each selected object** before they can proceed. This is enforced — no object can go through without at least one filter.

The user clicks "Add Details" on each object to open the filter wizard. There are two filter modes:

**Mode 1 — Field Level Filters**
- User picks a Salesforce field, an operator (equals, contains, greater than, etc.), and a value.
- Multiple conditions can be added.
- The user sets a match mode: **All Conditions** (AND), **Any Condition** (OR), or **Custom** (custom boolean logic expression).

**Mode 2 — SOQL Filter**
- User writes a raw SOQL WHERE clause (e.g. `CreatedDate < 2023-01-01`).
- The system prepends `SELECT FIELDS(ALL) FROM <ObjectName> WHERE` automatically — the user only writes the condition part.
- Before the user can proceed, the SOQL clause must be **validated** via the API (`POST /v1/archival-config/validate-soql`).
- Validation returns a **relationship depth** value — the number of relationship traversals (dots) found in the SOQL query (e.g. `Account.Owner.Name` = depth 2).

**Important — SOQL Relationship Depth:**
- The relationship depth value directly limits how many tiers of child objects the user can select in the next sub-step.
- Formula: `Max child tiers allowed = 5 − relationship depth`
- Examples:
  - Depth 0 → 5 child tiers available
  - Depth 1 → 4 child tiers available
  - Depth 2 → 3 child tiers available
  - Depth 3 → 2 child tiers available
  - Depth 4 → 1 child tier available
  - Depth 5 → no child selection allowed
- If the user changes the SOQL query and a new depth is returned, **all previously selected child objects are automatically cleared** to prevent stale or blocked selections.

**Rules:**
- Every selected object must have at least one field filter OR a validated SOQL query applied.
- Objects that are already included as a built child of another selected object are exempt from this requirement.
- Field filters and SOQL mode are mutually exclusive per object — switching modes clears the other.

---

#### 3c — Child Object Selection (per object)

After filters are set, the user can optionally expand relationships and select child objects to archive alongside the parent.

**What the user does:**
- Expands the child tree under an object.
- Toggles child relationships ON/OFF using the "Include Child" toggle.
- Each enabled child can itself have children, forming a tree up to the allowed depth.

**Rules:**
- Maximum child depth is **5 tiers** total, reduced by the SOQL relationship depth of the parent object.
- At the depth limit, the "Include Child" toggle is disabled — no further nesting is allowed.
- When a child is selected (toggle ON), its own children are automatically expanded for the user to optionally select.
- Duplicate child names at the same level are deduplicated — only one entry per relationship name is kept.
- Circular references (Object A → B → A) are guarded against internally.

---

#### 3d — Per-Object Schedule (optional, per object)

While still in the object detail wizard, the user can optionally set a **schedule specific to that object**.

**What the user does:**
- Enables "Override Schedule" for an object.
- Sets frequency (One Time, Hourly, Daily, Weekly, Monthly, Custom), start date, start time, timezone.

**Rules:**
- Per-object schedule is optional. If not set, the object will inherit the global schedule set in Step 4.
- If the user sets a per-object schedule, that object's schedule is fixed and the global schedule does not apply to it.

---

### Step 4 — Global Schedule

**What the user does:**
- Sets a global archive schedule that applies to all objects that do **not** have a per-object schedule.
- Options: One Time (run now or at a specific time), Hourly, Daily, Weekly (pick days), Monthly (pick months + day), Custom (start + end date range).
- Sets the timezone.

**Rules:**
- If **all** selected objects already have per-object schedules, the global schedule screen is shown in a read-only informational state — the user cannot set a global schedule and is informed that each object runs on its own schedule.
- If **any** object does not have a per-object schedule, the global schedule is required and will be applied to those objects.
- In the final payload sent to the API, each object carries its own `scheduleConfig` — either its per-object schedule, or the global schedule if it had none. There is no separate top-level schedule — it is always embedded per object.

---

### Step 5 — Dry Run (Preview Impact)

**What the user does:**
- Optionally clicks **"Run Dry Run"** to simulate the archive without moving any records.
- The system calls the API and returns estimated record counts per object.
- The user can also preview actual sample records by selecting up to 5 fields and fetching a live preview.
- The user can **Save as Draft** at this point — saves the config without activating it.

**What is shown after dry run:**
- **Per-Object Impact** tree table — shows every object and child with matching record count and estimated data size. Rows are collapsed by default; parents can be expanded to see children.
- **Sample Records Preview** — user picks an object, picks up to 5 fields, fetches a live sample of matching records.
- Total records count and total estimated data size across all objects.

**Rules:**
- Dry run is **optional** — the user can click "Skip & Next" to proceed without running it.
- If dry run is run, the total records and total data size are carried forward to the Review screen.
- If dry run is skipped, the Review screen shows a prompt telling the user to run dry run to see estimates.

---

### Step 6 — Review & Confirm

**What the user does:**
- Reviews a full summary of everything configured:
  - Archive name and description
  - Objects included (with filters shown — field conditions as pills, SOQL as a code block)
  - Record count and estimated data size (from dry run, or a prompt if skipped)
  - Schedule (frequency, start time, start date)
  - Source CRM and destination storage
- Chooses one of three actions:
  - **Save as Draft** — saves the config without scheduling or running it.
  - **Run Archive** — triggers the confirmation dialog, then activates the archive policy.
  - **Back** — returns to dry run step.

**Confirmation dialog (before Run Archive):**
- A modal warns the user that records will be **permanently removed from Salesforce** and moved to the archive.
- The user must type `ARCHIVE` exactly to confirm.
- Only after typing the confirmation word can the archive be activated.

**After confirmation:**
- The API is called (`POST /v1/archival-config` with status `ACTIVE`).
- A success screen is shown.
- The user is automatically redirected to the Archive Vault home after 2.5 seconds.

---

## Archive Vault Home — After Creation

Once archive policies are created, the home screen lists all of them with:
- Policy name, source CRM, destination, status (ACTIVE / DRAFT / RUNNING / FAILED)
- Last run time and next scheduled run
- Quick actions: Edit, Pause, Delete

Clicking a policy opens the **Detail Screen** which shows:
- Run history with status per run
- Per-run metrics: records archived, data size, duration
- Object-level breakdown per run
- The ability to edit the policy or trigger a manual run

---

## Key Rules Summary

| Rule | Detail |
|---|---|
| Objects shown | Only queryable + accessible + deletable Salesforce objects |
| Filter required | Every selected object needs at least one field filter or validated SOQL |
| SOQL depth impact | Each relationship level in SOQL reduces available child tiers by 1 |
| Max child tiers | 5 tiers total (minus SOQL relationship depth) |
| Child deduplication | Same-named siblings at the same level are deduplicated |
| Per-object schedule | Optional — overrides global schedule for that object |
| Global schedule | Required if any object has no per-object schedule |
| Payload structure | Each object in the API payload carries its own `scheduleConfig` |
| Dry run | Optional — provides record count estimates before committing |
| Confirmation | Must type `ARCHIVE` to activate — prevents accidental runs |
| Draft | Can be saved at Step 5 (dry run) or Step 6 (review) |
