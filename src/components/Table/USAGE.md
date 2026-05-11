# Table Component Usage Guide

The custom `Table` component is a reusable, flexible table component that supports both pagination modes and internal scrolling.

## Features

- **Flexible Pagination**: Toggle between pagination controls and inner scrolling
- **Height Adjustment**: Customize table height for different layouts
- **Numbered Page Buttons**: Show/hide pagination page numbers
- **Backward Compatible**: Works with legacy pagination API
- **Responsive**: Horizontal and vertical scrolling support
- **Customizable**: Column widths, styling, and renderers

## Basic Usage

### With Pagination Controls

```tsx
import Table, { TableColumn } from '@/components/Table';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

export function UserTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const users: User[] = []; // Your data

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => <div className='font-medium'>{user.name}</div>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => user.email,
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            user.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {user.status}
        </span>
      ),
    },
  ];

  return (
    <Table<User>
      columns={columns}
      rows={users}
      getRowKey={(user) => user.id}
      showPagination={true}
      itemsPerPage={10}
      showPageNumbers={true}
    />
  );
}
```

### With Inner Scrolling (No Pagination)

```tsx
<Table<User>
  columns={columns}
  rows={users}
  getRowKey={(user) => user.id}
  showPagination={false}
  height="h-96" // Tailwind class for 24rem height
/>
```

### With Custom Height

```tsx
<Table<User>
  columns={columns}
  rows={users}
  getRowKey={(user) => user.id}
  showPagination={false}
  height="600px" // Custom pixel height
/>
```

## Props

### Required Props

- **columns**: `TableColumn<TRow>[]` - Array of column definitions
- **rows**: `TRow[]` - Array of row data
- **getRowKey**: `(row: TRow, index: number) => string` - Function to generate unique row keys

### Optional Props

#### Pagination

- **showPagination**: `boolean` (default: `false`)
  - When `true`: Shows pagination controls at the bottom
  - When `false`: Shows inner scrollable table

- **itemsPerPage**: `number` (default: `10`)
  - Number of items to display per page (only used with `showPagination: true`)

- **showPageNumbers**: `boolean` (default: `true`)
  - Show numbered page buttons in pagination controls

#### Styling & Layout

- **height**: `string` (default: `'h-96'`)
  - Height of the table container
  - Accepts Tailwind classes (e.g., 'h-96', 'h-screen') or CSS values (e.g., '600px', '100vh')
  - Only used when `showPagination: false`

- **rowClassName**: `string`
  - CSS classes for table rows
  - Default: `'border-b border-gray-200 hover:bg-gray-50'`

- **emptyState**: `ReactNode`
  - Content to display when table is empty
  - Default: `'No records found.'`

- **paginationClassName**: `string`
  - Custom styling for pagination container

#### Advanced

- **pagination**: `TablePaginationConfig` (legacy)
  - For backward compatibility with old API
  - Accepts: `{ currentPage, pageSize, totalRecords, onPageChange }`

## Column Configuration

```tsx
interface TableColumn<TRow> {
  key: string;                                      // Unique column identifier
  header: ReactNode;                                // Column header text/component
  render: (row: TRow, index: number) => ReactNode; // Cell content renderer
  width?: string;                                   // Column width (e.g., '100px')
  className?: string;                               // Cell CSS classes
  headerClassName?: string;                         // Header CSS classes
}
```

## Examples

### Status Badge Column

```tsx
{
  key: 'status',
  header: 'Status',
  width: '120px',
  render: (row) => {
    const colorMap = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colorMap[row.status]}`}>
        {row.status}
      </span>
    );
  },
}
```

### Numeric Column with Formatting

```tsx
{
  key: 'records',
  header: 'Records',
  className: 'text-right',
  render: (row) => row.records.toLocaleString(),
}
```

### Action Column

```tsx
{
  key: 'actions',
  header: 'Actions',
  width: '120px',
  render: (row) => (
    <div className='flex gap-2'>
      <button className='text-blue-600 hover:underline text-sm'>Edit</button>
      <button className='text-red-600 hover:underline text-sm'>Delete</button>
    </div>
  ),
}
```

## Real-World Example

```tsx
import Table, { TableColumn } from '@/components/Table';
import { useState } from 'react';

interface BackupRun {
  id: string;
  startTime: string;
  status: 'Completed' | 'Failed' | 'In Progress';
  duration: string;
  dataSize: string;
  changes: number;
}

export function BackupHistoryTable() {
  const [currentPage, setCurrentPage] = useState(1);

  const backupRuns: BackupRun[] = [
    {
      id: '1',
      startTime: 'Apr 24, 2026, 02:00 AM',
      status: 'Completed',
      duration: '38m 10s',
      dataSize: '5.1 GB',
      changes: 243,
    },
    // ... more data
  ];

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
      render: (row) => {
        const statusColors = {
          Completed: 'bg-green-100 text-green-700',
          Failed: 'bg-red-100 text-red-700',
          'In Progress': 'bg-yellow-100 text-yellow-700',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => row.duration,
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (row) => row.dataSize,
    },
    {
      key: 'changes',
      header: 'Changes',
      className: 'text-green-600 font-medium',
      render: (row) => `+${row.changes}`,
    },
  ];

  return (
    <Table<BackupRun>
      columns={columns}
      rows={backupRuns}
      getRowKey={(row) => row.id}
      showPagination={true}
      itemsPerPage={10}
    />
  );
}
```

## Migration from Old API

If you're using the old pagination API, the component still supports it:

```tsx
// Old API (still supported)
<Table
  pagination={{
    currentPage: page,
    pageSize: 10,
    totalRecords: 100,
    onPageChange: (page) => setPage(page),
  }}
/>

// New API (recommended)
<Table
  showPagination={true}
  itemsPerPage={10}
/>
```

Both APIs work, but the new API is simpler and recommended for new code.
