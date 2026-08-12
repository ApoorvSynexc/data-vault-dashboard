# Restore Job — API Payload Reference

**Prepared by:** Frontend Team (DataCraft)  
**Date:** 2026-08-12  
**Endpoint:** `POST /v1/restore`  
**Content-Type:** `application/json`

---

## Overview

This document describes the complete request payload structure for creating a restore job. The payload is assembled across 9 wizard steps and submitted on the final Review & Submit screen. Every section below maps directly to a step in the wizard.

---

## Top-Level Structure

```json
{
  "source":      { ... },   // Step 2 — which backup/archive to restore from
  "selection":   { ... },   // Step 3 — what to restore (scope mode)
  "destination": { ... },   // Step 4 — target org
  "conflict":    { ... },   // Step 6 — how to handle existing records
  "jobDetail":   { ... },   // Step 5 — job name, description, tags
  "schedule":    { ... }    // Step 9 — when to run
}
```

---

## 1. `source` — Select Source Type (Step 2)

Identifies which backup configuration and which jobs to pull data from.

### Case 1: Entire Backup (all jobs included)

```json
"source": {
  "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
  "type": "ENTIRE"
}
```

### Case 2: Partial Backup (specific job IDs selected by user)

```json
"source": {
  "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
  "type": "PARTIAL",
  "backupJobIds": ["job-uuid-1", "job-uuid-2"]
}
```

### Case 3: Changed-Between (date range across jobs)

```json
"source": {
  "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
  "type": "CHANGED_BETWEEN",
  "backupJobIds": ["job-uuid-1"],
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-07-01T00:00:00Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `backupConfigId` | string (UUID) | Yes | The backup configuration to restore from |
| `type` | enum | Yes | `ENTIRE` \| `PARTIAL` \| `CHANGED_BETWEEN` |
| `backupJobIds` | string[] | When `PARTIAL` or `CHANGED_BETWEEN` | Specific job run IDs |
| `startDate` | ISO datetime string | When `CHANGED_BETWEEN` | Range start |
| `endDate` | ISO datetime string | When `CHANGED_BETWEEN` | Range end |

---

## 2. `selection.restoreScope` — Select Scope (Step 3)

Defines the granularity of what gets restored. Only one scope type is active per job.

### Case 1: Full Restore — restore everything, no filtering

```json
"selection": {
  "restoreScope": {
    "type": "ALL"
  }
}
```

---

### Case 2: By Object — restore one or more CRM objects entirely

```json
"selection": {
  "restoreScope": {
    "type": "OBJECT",
    "objects": ["Account", "Contact", "Opportunity"]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `objects` | string[] | Yes | CRM object API names to restore |

---

### Case 3: By Record — restore specific record IDs across one or more objects

The UI presents a searchable data table of all objects from the backup source. The user ticks rows (objects) and then selects records per object using a tabbed panel at the bottom (one tab per ticked object). Each ticked object produces one entry in the `records` array.

```json
"selection": {
  "restoreScope": {
    "type": "RECORD",
    "records": [
      {
        "objectName": "Account",
        "recordIds": ["001dN00000xECllQAG", "001dN00000xEClmQAG"]
      },
      {
        "objectName": "Contact",
        "recordIds": ["003dN00000xABcDQAG"]
      }
    ]
  }
}
```

**UI behaviour:**
- A table lists all available objects (from the backup source) with a checkbox column.
- Ticking an object adds a tab at the bottom of the panel for that object.
- The tab shows a searchable record table + "Load more" pagination for that object.
- Users can tick/untick multiple records per tab independently.
- A summary row shows `N objects · M records total` across all selected objects.

| Field | Type | Required | Description |
|---|---|---|---|
| `records` | array | Yes | One entry per object that has at least one selected record |
| `records[].objectName` | string | Yes | CRM object API name |
| `records[].recordIds` | string[] | Yes | Salesforce record IDs (18-char) selected by the user |

---

### Case 4: By Field — restore specific fields per object

The UI uses a split-panel layout:

- **Left panel:** searchable list of all objects (from the backup source) with a checkbox per row. Ticking an object enables the "Select Fields →" button for that row.
- **Right panel:** field chip-picker for the currently active (selected) object. Shows All / Standard / Custom / Required filter tabs.

Multiple objects can be configured simultaneously — each ticked object is independent.

```json
"selection": {
  "restoreScope": {
    "type": "FIELD",
    "fields": [
      {
        "objectName": "Account",
        "fieldNames": ["Name", "AnnualRevenue", "OwnerId"]
      },
      {
        "objectName": "Contact",
        "fieldNames": ["Email", "Phone"]
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fields` | array | Yes | One entry per object |
| `fields[].objectName` | string | Yes | CRM object API name |
| `fields[].fieldNames` | string[] | Yes | Field API names to restore |

---

### Case 5: Custom Filter — filter records across one or more objects

The UI allows the user to add multiple objects to a single filter job. Each object gets its own tab. Per object, the user can choose between **Visual Builder** (field/operator/value rows with optional OR groups) or **Write SOQL** (raw WHERE clause input).

Each added object produces one entry in the `objects` array.

#### Case 5a: Visual Builder (AND/OR conditions)

```json
"selection": {
  "restoreScope": {
    "type": "FILTER",
    "objects": [
      {
        "objectName": "Account",
        "filters": {
          "type": "AND",
          "fields": [
            {
              "name": "AnnualRevenue",
              "dataType": "number",
              "operator": ">",
              "value": "100000"
            },
            {
              "name": "Industry",
              "dataType": "picklist",
              "operator": "=",
              "value": "Technology"
            }
          ]
        }
      },
      {
        "objectName": "Contact",
        "filters": {
          "type": "AND",
          "fields": [
            {
              "name": "Email",
              "dataType": "string",
              "operator": "LIKE",
              "value": "%acme.com"
            }
          ]
        }
      }
    ]
  }
}
```

#### Case 5b: Raw SOQL (per object)

```json
"selection": {
  "restoreScope": {
    "type": "FILTER",
    "objects": [
      {
        "objectName": "Account",
        "filters": {
          "type": "SOQL",
          "soqlQuery": "SELECT Id FROM Account WHERE AnnualRevenue > 100000 AND Industry = 'Technology'"
        }
      },
      {
        "objectName": "Opportunity",
        "filters": {
          "type": "SOQL",
          "soqlQuery": "SELECT Id FROM Opportunity WHERE StageName = 'Closed Won'"
        }
      }
    ]
  }
}
```

**Note:** Visual Builder and SOQL modes are tab-level settings shared across all objects in the same job. The mode selected (visual/soql) is applied consistently — each object's WHERE clause is built from its own filter rows (visual) or its own SOQL input (soql).

| Field | Type | Required | Description |
|---|---|---|---|
| `objects` | array | Yes | One entry per added object |
| `objects[].objectName` | string | Yes | CRM object the filter applies to |
| `objects[].filters.type` | enum | Yes | `AND` \| `OR` \| `SOQL` |
| `objects[].filters.fields[].name` | string | Yes (AND/OR) | Field API name |
| `objects[].filters.fields[].dataType` | enum | Yes (AND/OR) | `string` \| `number` \| `boolean` \| `date` \| `datetime` \| `id` \| `picklist` |
| `objects[].filters.fields[].operator` | enum | Yes (AND/OR) | `=` \| `!=` \| `>` \| `<` \| `>=` \| `<=` \| `IN` \| `LIKE` |
| `objects[].filters.fields[].value` | string | Yes (AND/OR) | The filter value (always serialized as string) |
| `objects[].filters.soqlQuery` | string | Yes (SOQL) | Full SOQL query string (built by frontend: `SELECT Id FROM {object} WHERE {userInput}`) |

---

### Case 6: Deleted-Only — restore records deleted in destination since snapshot

```json
"selection": {
  "restoreScope": {
    "type": "DELETED_ONLY",
    "deletedOnly": true
  }
}
```

Backend should compare source snapshot against destination and restore records that exist in source but are missing (or in recycle bin) in destination. Records never deleted should not be touched.

---

### Case 7: Changed-Since — restore only records/fields that differ from snapshot after a date

```json
"selection": {
  "restoreScope": {
    "type": "CHANGE_SINCE",
    "changeSince": {
      "date": "2026-05-01"
    }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `changeSince.date` | ISO date string | Yes | Only records modified after this date are considered |

Two-level diff: first find records where at least one field differs from the snapshot, then within those records write back only the differing fields.

---

### Case 8: Bulk via CSV — restore records matched by a list of IDs across one or more objects

The UI shows a table of all available objects (from the backup source). The user ticks one or more objects — each ticked object gets its own CSV upload / paste area in a tabbed panel at the bottom. Each ticked object produces one entry in the `records` array.

```json
"selection": {
  "restoreScope": {
    "type": "BULK_CSV",
    "records": [
      {
        "objectName": "Account",
        "bulkCsvIds": [
          "001dN00000xECllQAG",
          "001dN00000xEClmQAG",
          "001dN00000xEClnQAG"
        ]
      },
      {
        "objectName": "Contact",
        "bulkCsvIds": [
          "003dN00000xABcDQAG",
          "003dN00000xABcDQAH"
        ]
      }
    ]
  }
}
```

**CSV format:** Each CSV must have a header row. The column containing record IDs must be named `Id` or `id` (case-insensitive). Extra columns are ignored.

```csv
Id,Name
001dN00000xECllQAG,Acme Corp
001dN00000xEClmQAG,Globex Inc
```

| Field | Type | Required | Description |
|---|---|---|---|
| `records` | array | Yes | One entry per ticked object |
| `records[].objectName` | string | Yes | CRM object the IDs belong to |
| `records[].bulkCsvIds` | string[] | Yes | Salesforce record IDs parsed from CSV upload or paste for this object |

---

## 3. `destination` — Set Destination (Step 4)

Where the data will be restored to.

### Case 1: Same Org (currently the only active option in UI)

```json
"destination": {
  "type": "SAME"
}
```

### Case 2: Different Org (future — UI hidden for now)

```json
"destination": {
  "type": "DIFFERENT",
  "crmId": "crm-connection-uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | enum | Yes | `SAME` \| `DIFFERENT` |
| `crmId` | string (UUID) | When `DIFFERENT` | Target CRM connection ID |

---

## 4. `conflict` — Conflict Config + Edge Cases (Steps 6 & 7)

The `conflict` object carries both the restore mode and, nested inside it, all edge case handling rules collected from Step 7.

### 4a. `restoreMode`

How to handle a source record when a record with the same ID already exists in the destination.

```json
"conflict": {
  "restoreMode": "OVERWRITE"
}
```

| `restoreMode` value | UI Label | Behaviour |
|---|---|---|
| `OVERWRITE` | Overwrite Existing | Source record replaces destination — every field overwritten. **Default / Recommended.** |
| `APPEND_NEW` | Append as New Records | Always insert — creates duplicates if record already exists |
| `SKIP` | Skip if Exists | Do not touch records already in destination |
| `REPLACE_ENTIRE_OBJECT` | Replace Entire Object | Delete all destination records for that object, then insert from source. **Destructive.** |
| `MERGE` | Merge (per-field rule) | Apply per-field merge rules defined in `fieldMergeRules`. See section 4c below. |

### Scope × Restore Mode Availability Matrix

Not all restore modes are available for every scope. The frontend enforces the following rules:

| Scope | Hidden Modes |
|---|---|
| By Record | `REPLACE_ENTIRE_OBJECT` |
| By Field | `REPLACE_ENTIRE_OBJECT`, `APPEND_NEW` |
| Custom Filter | `REPLACE_ENTIRE_OBJECT` |
| Deleted-Only | `SKIP`, `MERGE`, `REPLACE_ENTIRE_OBJECT` |
| Changed-Since | `REPLACE_ENTIRE_OBJECT` |
| Bulk CSV | `REPLACE_ENTIRE_OBJECT` |
| Full / By Object | All modes available |

---

### 4b. `edgeCases` — Edge Case Handling (Step 7)

All enum values follow the rule: **UI label → UPPERCASE + spaces/special chars replaced with `_`**

> Example: `"Use destination if newer"` → `"USE_DESTINATION_IF_NEWER"`

#### Complete `edgeCases` object

```json
"conflict": {
  "restoreMode": "OVERWRITE",
  "edgeCases": {
    "onDuplicateRecord": "USE_DESTINATION_IF_NEWER",

    "missingFieldInDestination": "MAP_TO_EXISTING_FIELD",
    "fieldMappings": [
      { "sourceField": "Account.Legacy_ID__c", "destinationField": "Account.ExternalId__c" }
    ],

    "ownerInactive": "REASSIGN_TO_SPECIFIED_USER",
    "ownerInactiveFallbackUserId": "0051a000001XYZaAAO",

    "parentMissing": "RESTORE_PARENT_FIRST",

    "recordTypeMissing": "MAP_MANUALLY",
    "recordTypeMappings": [
      { "sourceRecordType": "Support Case", "destinationRecordType": "Standard Case" },
      { "sourceRecordType": "Escalation",   "destinationRecordType": "Tier-2" }
    ],

    "missingRequiredFieldValue": "USE_SPECIFIED_DEFAULT_PER_FIELD",
    "fieldDefaults": [
      {
        "object": "Account",
        "fields": [
          { "name": "Industry", "type": "PICKLIST", "value": "Other" },
          { "name": "Type",     "type": "PICKLIST", "value": "Customer" }
        ]
      },
      {
        "object": "Contact",
        "fields": [
          { "name": "Email", "type": "EMAIL", "value": "noreply@acme.com" }
        ]
      }
    ]
  }
}
```

---

#### `onDuplicateRecord`

Triggered when a record with the same Id (or external Id) already exists in the destination.

> **Visibility:** Hidden when scope + restore mode combination makes duplicates impossible (e.g. scope = `APPEND_NEW` always inserts, so duplicates are intentional and this field is irrelevant).

| Value | UI Label |
|---|---|
| `OVERWRITE` | Overwrite |
| `SKIP` | Skip |
| `CREATE_NEW_COPY_WITH_SUFFIX` | Create new copy with suffix |
| `USE_DESTINATION_IF_NEWER` | Use destination if newer *(Recommended)* |

---

#### `missingFieldInDestination`

Triggered when the source record has a field that does not exist in the destination schema.

| Value | UI Label |
|---|---|
| `SKIP_THE_FIELD` | Skip the field *(Recommended)* |
| `MAP_TO_EXISTING_FIELD` | Map to existing field |
| `FAIL_THE_RECORD` | Fail the record |

When value is `MAP_TO_EXISTING_FIELD`, a `fieldMappings` array must be sent:

```json
"fieldMappings": [
  { "sourceField": "Account.Legacy_ID__c", "destinationField": "Account.ExternalId__c" },
  { "sourceField": "Account.Old_Code__c",  "destinationField": "Account.Reference__c"  }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fieldMappings` | array | When `MAP_TO_EXISTING_FIELD` | One entry per source→destination field pair |
| `fieldMappings[].sourceField` | string | Yes | Source field in `Object.FieldName` format |
| `fieldMappings[].destinationField` | string | Yes | Destination field in `Object.FieldName` format |

---

#### `ownerInactive`

Triggered when the original record owner no longer exists or is deactivated in the destination org.

| Value | UI Label |
|---|---|
| `REASSIGN_TO_SPECIFIED_USER` | Reassign to specified user *(Recommended)* |
| `REASSIGN_TO_MANAGER` | Reassign to manager |
| `REASSIGN_TO_QUEUE` | Reassign to queue |
| `SKIP_RECORD` | Skip record |

When value is `REASSIGN_TO_SPECIFIED_USER`, an additional field must be sent:

```json
"ownerInactiveFallbackUserId": "0051a000001XYZaAAO"
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ownerInactiveFallbackUserId` | string (Salesforce User ID) | When `REASSIGN_TO_SPECIFIED_USER` | 18-char Salesforce User ID of the fallback owner |

---

#### `parentMissing`

Triggered when a record's parent lookup field points to a record that is missing or deleted in the destination.

| Value | UI Label |
|---|---|
| `RE_PARENT_TO_PLACEHOLDER` | Re-parent to placeholder |
| `RESTORE_PARENT_FIRST` | Restore parent first *(Recommended)* |
| `SKIP` | Skip |

---

#### `recordTypeMissing`

Triggered when the source record uses a `RecordType` that does not exist in the destination org.

| Value | UI Label |
|---|---|
| `MAP_TO_DEFAULT` | Map to default *(Recommended)* |
| `MAP_MANUALLY` | Map manually |
| `SKIP` | Skip |

When value is `MAP_MANUALLY`, a `recordTypeMappings` array must be sent:

```json
"recordTypeMappings": [
  { "sourceRecordType": "Support Case", "destinationRecordType": "Standard Case" },
  { "sourceRecordType": "Escalation",   "destinationRecordType": "Tier-2"        }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `recordTypeMappings` | array | When `MAP_MANUALLY` | One entry per source record type |
| `recordTypeMappings[].sourceRecordType` | string | Yes | Record type name as it exists in the source org |
| `recordTypeMappings[].destinationRecordType` | string | Yes | Matching record type name in the destination org |

---

#### `missingRequiredFieldValue`

Triggered when the destination has a mandatory field and the source record value is blank or null.

| Value | UI Label |
|---|---|
| `USE_SPECIFIED_DEFAULT_PER_FIELD` | Use specified default per field *(Recommended)* |
| `USE_LAST_KNOWN_VALUE_FROM_HISTORY` | Use last known value from history |
| `SKIP_THE_RECORD` | Skip the record |
| `SKIP_THE_OBJECT` | Skip the object |

When value is `USE_SPECIFIED_DEFAULT_PER_FIELD`, a `fieldDefaults` array must be sent:

```json
"fieldDefaults": [
  {
    "object": "Contact",
    "fields": [
      { "name": "LastName",  "type": "TEXT",     "value": "Unknown" },
      { "name": "Status__c", "type": "PICKLIST",  "value": "Active"  }
    ]
  }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fieldDefaults` | array | When `USE_SPECIFIED_DEFAULT_PER_FIELD` | One entry per object |
| `fieldDefaults[].object` | string | Yes | CRM object API name |
| `fieldDefaults[].fields[].name` | string | Yes | Field API name |
| `fieldDefaults[].fields[].type` | enum | Yes | `TEXT` \| `PICKLIST` \| `EMAIL` \| `NUMBER` \| `DATE` \| `CHECKBOX` |
| `fieldDefaults[].fields[].value` | string | Yes | The fallback value to use (always serialized as string) |

---

### 4c. `fieldMergeRules` — Merge Mode Per-Field Rules (Step 6, when `restoreMode = MERGE`)

When `restoreMode` is `MERGE`, the backend applies per-field rules instead of blanket overwrite or skip. Each entry in `fieldMergeRules` declares how one field across one or more objects should behave during the merge. Fields not listed fall back to the `defaultMergeRule`.

```json
"conflict": {
  "restoreMode": "MERGE",
  "defaultMergeRule": "USE_SOURCE",
  "fieldMergeRules": [
    {
      "objectName": "Account",
      "fieldName": "AnnualRevenue",
      "rule": "USE_DESTINATION"
    },
    {
      "objectName": "Account",
      "fieldName": "Description",
      "rule": "CONCATENATE",
      "concatenateSeparator": " | "
    },
    {
      "objectName": "Contact",
      "fieldName": "Email",
      "rule": "USE_NEWER"
    },
    {
      "objectName": "Contact",
      "fieldName": "Phone",
      "rule": "USE_SOURCE_IF_BLANK"
    }
  ]
}
```

**UI behaviour for Merge mode:**  
When the user selects "Merge (per-field rule)" as the restore mode, a 3-column table appears below the mode selector with columns **Object**, **Field**, and **Rule**. A "Default for all fields" row at the top sets the fallback rule. Each per-field override row has free-text inputs for the object and field API names plus a rule dropdown. Rows are added manually via "+ Add per-field override" and removed with the × button. The `concatenateSeparator` companion field is relevant when `rule = CONCATENATE` (text fields only).

| Field | Type | Required | Description |
|---|---|---|---|
| `defaultMergeRule` | enum | When `MERGE` | Fallback rule for fields not listed in `fieldMergeRules` |
| `fieldMergeRules` | array | When `MERGE` | One entry per field that needs a non-default rule |
| `fieldMergeRules[].objectName` | string | Yes | CRM object API name |
| `fieldMergeRules[].fieldName` | string | Yes | Field API name |
| `fieldMergeRules[].rule` | enum | Yes | See merge rule values below |
| `fieldMergeRules[].concatenateSeparator` | string | When `rule = CONCATENATE` | String inserted between source and destination values |

#### Merge Rule Values

| Value | UI Label | Description |
|---|---|---|
| `USE_SOURCE` | Use source value | Overwrite destination with source value *(Default)* |
| `USE_DESTINATION` | Keep destination value | Leave the destination field unchanged |
| `USE_NEWER` | Use newer value | Compare `LastModifiedDate` of source vs destination record; use the one modified more recently |
| `USE_SOURCE_IF_BLANK` | Use source if destination is blank | Only write source value when destination field is null/empty |
| `USE_DESTINATION_IF_BLANK` | Use destination if source is blank | Only keep destination when source field is null/empty |
| `CONCATENATE` | Concatenate values | Append source value to destination value with a configurable separator (text fields only) |
| `USE_LARGER` | Use larger value | Numeric fields — pick the higher of source vs destination |
| `USE_SMALLER` | Use smaller value | Numeric fields — pick the lower of source vs destination |

---

## 5. `jobDetail` — Define Restore Policy (Step 5)

Metadata about the restore job for identification and audit.

```json
"jobDetail": {
  "name": "Restore - Account June Snapshot",
  "description": "Triggered by INC-4711 — restoring deleted accounts",
  "tags": ["incident", "INC-4711", "accounts"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Human-readable job name |
| `description` | string | No | Free-text description |
| `tags` | string[] | No | Labels for filtering/search in the UI |

---

## 6. `schedule` — Review & Submit (Step 9)

When the restore job should run.

### Case 1: One-time run (default)

```json
"schedule": {
  "type": "ONE_TIME",
  "timeZone": "Asia/Calcutta"
}
```

### Case 2: Recurring

```json
"schedule": {
  "type": "INCREMENTAL",
  "timeZone": "Asia/Calcutta",
  "scheduling": {
    "frequency": "DAILY",
    "interval": 1,
    "startDate": "2026-08-12",
    "endDate": "2026-12-31",
    "startTime": "06:00",
    "weekDays": ["MON", "WED", "FRI"],
    "monthDate": 1
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | enum | Yes | `ONE_TIME` \| `INCREMENTAL` |
| `timeZone` | IANA timezone string | Yes | e.g. `Asia/Calcutta`, `America/New_York` |
| `scheduling.frequency` | enum | When `INCREMENTAL` | `HOURLY` \| `DAILY` \| `WEEKLY` \| `MONTHLY` \| `CUSTOM` \| `ONCE` |
| `scheduling.interval` | number | No | Repeat every N units of frequency |
| `scheduling.startDate` | ISO date string | No | When the schedule begins |
| `scheduling.endDate` | ISO date string | No | When the schedule ends |
| `scheduling.startTime` | `HH:mm` string | No | Time of day to run |
| `scheduling.weekDays` | enum[] | When `WEEKLY` | `MON` \| `TUE` \| `WED` \| `THU` \| `FRI` \| `SAT` \| `SUN` |
| `scheduling.monthDate` | number (1–31) | When `MONTHLY` | Day of the month to run |

---

## Complete Example Payloads

### Example A — Full Restore, One-Time

```json
{
  "source": {
    "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
    "type": "ENTIRE"
  },
  "selection": {
    "restoreScope": {
      "type": "ALL"
    }
  },
  "destination": {
    "type": "SAME"
  },
  "conflict": {
    "restoreMode": "OVERWRITE"
  },
  "jobDetail": {
    "name": "Full Restore - June Snapshot",
    "description": "Emergency restore after data loss incident INC-4711",
    "tags": ["INC-4711", "emergency"]
  },
  "schedule": {
    "type": "ONE_TIME",
    "timeZone": "Asia/Calcutta"
  }
}
```

### Example B — Custom Filter (Visual Builder), Multiple Objects, Skip Conflicts

```json
{
  "source": {
    "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
    "type": "PARTIAL",
    "backupJobIds": ["job-uuid-1", "job-uuid-2"]
  },
  "selection": {
    "restoreScope": {
      "type": "FILTER",
      "objects": [
        {
          "objectName": "Account",
          "filters": {
            "type": "AND",
            "fields": [
              { "name": "AnnualRevenue", "dataType": "number",   "operator": ">",  "value": "100000" },
              { "name": "Industry",      "dataType": "picklist", "operator": "=",  "value": "Technology" }
            ]
          }
        },
        {
          "objectName": "Contact",
          "filters": {
            "type": "AND",
            "fields": [
              { "name": "Email", "dataType": "string", "operator": "LIKE", "value": "%acme.com" }
            ]
          }
        }
      ]
    }
  },
  "destination": {
    "type": "SAME"
  },
  "conflict": {
    "restoreMode": "SKIP"
  },
  "jobDetail": {
    "name": "Account + Contact Filter Restore",
    "description": "Restore high-value tech accounts and their contacts",
    "tags": ["accounts", "contacts", "tech"]
  },
  "schedule": {
    "type": "ONE_TIME",
    "timeZone": "Asia/Calcutta"
  }
}
```

### Example C — By Record (Multiple Objects), Overwrite

```json
{
  "source": {
    "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
    "type": "ENTIRE"
  },
  "selection": {
    "restoreScope": {
      "type": "RECORD",
      "records": [
        {
          "objectName": "Account",
          "recordIds": ["001dN00000xECllQAG", "001dN00000xEClmQAG"]
        },
        {
          "objectName": "Contact",
          "recordIds": ["003dN00000xABcDQAG"]
        }
      ]
    }
  },
  "destination": {
    "type": "SAME"
  },
  "conflict": {
    "restoreMode": "OVERWRITE"
  },
  "jobDetail": {
    "name": "Account + Contact Record Restore",
    "description": "Targeted restore for specific account and contact records",
    "tags": ["targeted", "accounts", "contacts"]
  },
  "schedule": {
    "type": "ONE_TIME",
    "timeZone": "Asia/Calcutta"
  }
}
```

### Example D — Bulk CSV (Multiple Objects), Append New, Daily Schedule

```json
{
  "source": {
    "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
    "type": "ENTIRE"
  },
  "selection": {
    "restoreScope": {
      "type": "BULK_CSV",
      "records": [
        {
          "objectName": "Contact",
          "bulkCsvIds": [
            "003dN00000xECllQAG",
            "003dN00000xEClmQAG"
          ]
        },
        {
          "objectName": "Account",
          "bulkCsvIds": [
            "001dN00000xECllQAG"
          ]
        }
      ]
    }
  },
  "destination": {
    "type": "SAME"
  },
  "conflict": {
    "restoreMode": "APPEND_NEW"
  },
  "jobDetail": {
    "name": "Contact + Account CSV Restore",
    "description": "Restoring contacts and accounts from uploaded ID lists",
    "tags": ["contacts", "accounts", "csv"]
  },
  "schedule": {
    "type": "INCREMENTAL",
    "timeZone": "Asia/Calcutta",
    "scheduling": {
      "frequency": "DAILY",
      "interval": 1,
      "startDate": "2026-08-12",
      "startTime": "06:00"
    }
  }
}
```

### Example E — Merge Mode with Per-Field Rules

```json
{
  "source": {
    "backupConfigId": "d3ebd16e-33ff-42f6-a4e9-4a9fdc3d6e39",
    "type": "ENTIRE"
  },
  "selection": {
    "restoreScope": {
      "type": "OBJECT",
      "objects": ["Account", "Contact"]
    }
  },
  "destination": {
    "type": "SAME"
  },
  "conflict": {
    "restoreMode": "MERGE",
    "defaultMergeRule": "USE_SOURCE",
    "fieldMergeRules": [
      { "objectName": "Account", "fieldName": "AnnualRevenue",  "rule": "USE_LARGER" },
      { "objectName": "Account", "fieldName": "Description",    "rule": "CONCATENATE", "concatenateSeparator": " | " },
      { "objectName": "Contact", "fieldName": "Email",          "rule": "USE_NEWER" },
      { "objectName": "Contact", "fieldName": "Phone",          "rule": "USE_SOURCE_IF_BLANK" }
    ]
  },
  "jobDetail": {
    "name": "Account + Contact Merge Restore",
    "description": "Merge-mode restore — keep best values per field",
    "tags": ["merge", "accounts", "contacts"]
  },
  "schedule": {
    "type": "ONE_TIME",
    "timeZone": "Asia/Calcutta"
  }
}
```

---

## Enums Quick Reference

| Field | Allowed Values |
|---|---|
| `source.type` | `ENTIRE` \| `PARTIAL` \| `CHANGED_BETWEEN` |
| `selection.restoreScope.type` | `ALL` \| `OBJECT` \| `RECORD` \| `FIELD` \| `FILTER` \| `DELETED_ONLY` \| `CHANGE_SINCE` \| `BULK_CSV` |
| `filters.type` (inside FILTER scope per object) | `AND` \| `OR` \| `SOQL` |
| `filters.fields[].dataType` | `string` \| `number` \| `boolean` \| `date` \| `datetime` \| `id` \| `picklist` |
| `filters.fields[].operator` | `=` \| `!=` \| `>` \| `<` \| `>=` \| `<=` \| `IN` \| `LIKE` |
| `destination.type` | `SAME` \| `DIFFERENT` |
| `conflict.restoreMode` | `OVERWRITE` \| `APPEND_NEW` \| `SKIP` \| `REPLACE_ENTIRE_OBJECT` \| `MERGE` |
| `conflict.defaultMergeRule` | `USE_SOURCE` \| `USE_DESTINATION` \| `USE_NEWER` \| `USE_SOURCE_IF_BLANK` \| `USE_DESTINATION_IF_BLANK` \| `CONCATENATE` \| `USE_LARGER` \| `USE_SMALLER` |
| `conflict.fieldMergeRules[].rule` | `USE_SOURCE` \| `USE_DESTINATION` \| `USE_NEWER` \| `USE_SOURCE_IF_BLANK` \| `USE_DESTINATION_IF_BLANK` \| `CONCATENATE` \| `USE_LARGER` \| `USE_SMALLER` |
| `conflict.edgeCases.onDuplicateRecord` | `OVERWRITE` \| `SKIP` \| `CREATE_NEW_COPY_WITH_SUFFIX` \| `USE_DESTINATION_IF_NEWER` |
| `conflict.edgeCases.missingFieldInDestination` | `SKIP_THE_FIELD` \| `MAP_TO_EXISTING_FIELD` \| `FAIL_THE_RECORD` |
| `conflict.edgeCases.fieldMappings[].sourceField` | `Object.FieldName` string — required when `MAP_TO_EXISTING_FIELD` |
| `conflict.edgeCases.fieldMappings[].destinationField` | `Object.FieldName` string — required when `MAP_TO_EXISTING_FIELD` |
| `conflict.edgeCases.ownerInactive` | `REASSIGN_TO_SPECIFIED_USER` \| `REASSIGN_TO_MANAGER` \| `REASSIGN_TO_QUEUE` \| `SKIP_RECORD` |
| `conflict.edgeCases.parentMissing` | `RE_PARENT_TO_PLACEHOLDER` \| `RESTORE_PARENT_FIRST` \| `SKIP` |
| `conflict.edgeCases.recordTypeMissing` | `MAP_TO_DEFAULT` \| `MAP_MANUALLY` \| `SKIP` |
| `conflict.edgeCases.recordTypeMappings[].sourceRecordType` | string — required when `MAP_MANUALLY` |
| `conflict.edgeCases.recordTypeMappings[].destinationRecordType` | string — required when `MAP_MANUALLY` |
| `conflict.edgeCases.missingRequiredFieldValue` | `USE_SPECIFIED_DEFAULT_PER_FIELD` \| `USE_LAST_KNOWN_VALUE_FROM_HISTORY` \| `SKIP_THE_RECORD` \| `SKIP_THE_OBJECT` |
| `conflict.edgeCases.fieldDefaults[].fields[].type` | `TEXT` \| `PICKLIST` \| `EMAIL` \| `NUMBER` \| `DATE` \| `CHECKBOX` |
| `schedule.type` | `ONE_TIME` \| `INCREMENTAL` |
| `schedule.scheduling.frequency` | `HOURLY` \| `DAILY` \| `WEEKLY` \| `MONTHLY` \| `CUSTOM` \| `ONCE` |
| `schedule.scheduling.weekDays[]` | `MON` \| `TUE` \| `WED` \| `THU` \| `FRI` \| `SAT` \| `SUN` |
| `schedule.scheduling.selectedMonths[]` | `JAN` \| `FEB` \| `MAR` \| `APR` \| `MAY` \| `JUN` \| `JUL` \| `AUG` \| `SEP` \| `OCT` \| `NOV` \| `DEC` |
