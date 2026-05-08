# Custom Table Component - Summary

## Overview

A fully reusable, flexible table component has been created to replace repetitive table implementations across the application. The component supports both **pagination mode** and **inner scrolling mode**, with customizable heights and styling options.

## What Was Created

### 1. Enhanced Table Component
**Location:** `src/components/Table/index.tsx`

**Features:**
- ✅ Generic TypeScript support for type-safe row/column definitions
- ✅ **Pagination Toggle**: Show pagination controls OR inner scrollable table
- ✅ **Flexible Height Control**: Support for Tailwind classes and custom CSS values
- ✅ **Numbered Page Buttons**: Optionally show/hide numbered pagination
- ✅ **Custom Column Renderers**: Define any custom content for cells
- ✅ **Column Width Control**: Set specific widths for columns
- ✅ **Backward Compatible**: Still supports old pagination API
- ✅ **Sticky Headers**: Headers remain visible when scrolling
- ✅ **Empty State Support**: Customizable empty state message
- ✅ **Responsive**: Horizontal and vertical scrolling

### 2. Usage Documentation
**Location:** `src/components/Table/USAGE.md`

Comprehensive guide with:
- Feature overview
- Basic usage examples
- Props documentation
- Column configuration guide
- Real-world examples
- Migration guide from old API

### 3. Refactored Components

#### BackupHistory Component
**Location:** `src/pages/BackupManagementV2/BackupDetails/BackupHistory/index.tsx`

**Changes:**
- Removed manual table markup
- Now uses custom Table component
- Uses pagination mode (`showPagination={true}`)
- Clean, maintainable code (reduced from ~170 lines to ~120 lines)

#### ObjectsNData Component
**Location:** `src/pages/BackupManagementV2/BackupDetails/ObjectsNData/index.tsx`

**Changes:**
- Removed manual table markup
- Now uses custom Table component
- Uses pagination mode (`showPagination={true}`)
- Integrated search/filter with the table
- Clean, maintainable code (reduced from ~180 lines to ~140 lines)

## Key Props

### Core Props (Required)
```typescript
columns: TableColumn<TRow>[]     // Column definitions
rows: TRow[]                      // Row data
getRowKey: (row, index) => string // Key generator for rows
```

### Pagination Control
```typescript
showPagination?: boolean          // true: show pagination, false: inner scroll
itemsPerPage?: number             // Items per page (default: 10)
showPageNumbers?: boolean         // Show numbered buttons (default: true)
```

### Layout Control
```typescript
height?: string                   // 'h-96' | '600px' (default: 'h-96')
rowClassName?: string             // Custom row styling
paginationClassName?: string      // Custom pagination styling
```

## Usage Examples

### With Pagination
```tsx
<Table<BackupRun>
  columns={columns}
  rows={backupRuns}
  getRowKey={(row) => String(row.id)}
  showPagination={true}
  itemsPerPage={10}
  showPageNumbers={true}
/>
```

### With Inner Scrolling
```tsx
<Table<BackupObject>
  columns={columns}
  rows={objects}
  getRowKey={(row) => String(row.id)}
  showPagination={false}
  height="h-96"
/>
```

### With Custom Height
```tsx
<Table<MyData>
  columns={columns}
  rows={data}
  getRowKey={(row) => row.id}
  showPagination={false}
  height="600px"
/>
```

## Column Definition Example

```typescript
interface TableColumn<TRow> {
  key: string;                              // Unique identifier
  header: ReactNode;                        // Column header
  render: (row: TRow, index: number) => ReactNode;  // Cell content
  width?: string;                           // Optional width
  className?: string;                       // Cell CSS classes
  headerClassName?: string;                 // Header CSS classes
}

// Usage:
const columns: TableColumn<BackupRun>[] = [
  {
    key: 'startTime',
    header: 'Start Time',
    render: (row) => row.startTime,
  },
  {
    key: 'status',
    header: 'Status',
    width: '130px',
    render: (row) => (
      <span className={getStatusColor(row.status)}>
        {row.status}
      </span>
    ),
  },
];
```

## Benefits

1. **Code Reusability**: Single component used across multiple pages
2. **Consistency**: Uniform table styling and behavior
3. **Maintainability**: Bug fixes and improvements apply to all tables
4. **Flexibility**: Works with pagination or inner scrolling
5. **Type Safety**: Full TypeScript support
6. **Less Code**: Reduced boilerplate in each page component
7. **Performance**: Optimized rendering with internal pagination

## Backward Compatibility

The component still supports the old pagination API:

```typescript
// Old API (still works)
<Table
  pagination={{
    currentPage: page,
    pageSize: 10,
    totalRecords: 100,
    onPageChange: (page) => setPage(page),
  }}
/>
```

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/Table/index.tsx` | Enhanced with new props and pagination toggle |
| `src/components/Table/USAGE.md` | NEW - Comprehensive usage guide |
| `src/pages/BackupManagementV2/BackupDetails/BackupHistory/index.tsx` | Refactored to use Table component |
| `src/pages/BackupManagementV2/BackupDetails/ObjectsNData/index.tsx` | Refactored to use Table component |

## Next Steps

You can now use this Table component in any other page that needs tables:

1. Import it: `import Table, { TableColumn } from '@/components/Table'`
2. Define columns with type safety
3. Pass your data rows
4. Choose pagination mode (show pagination or inner scroll)
5. Customize height as needed

## Additional Notes

- The component wraps horizontal and vertical scrolling automatically
- Headers remain sticky while scrolling (for vertical scroll mode)
- Pagination state is managed internally when not using external pagination
- All styling uses Tailwind CSS for consistency
- The component is fully responsive
