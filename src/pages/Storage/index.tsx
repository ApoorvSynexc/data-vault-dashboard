// ── Storage & Retention page ──────────────────────────────────────────────────

type StorageItem = {
  label: string;
  value: string;
  pct: number;
  color: string;
};

const storageBreakdown: StorageItem[] = [
  { label: 'Salesforce',    value: '980 GB', pct: 90, color: 'bg-blue-500'   },
  { label: 'HubSpot',       value: '650 GB', pct: 60, color: 'bg-orange-500' },
  { label: 'Zoho CRM',      value: '430 GB', pct: 44, color: 'bg-green-500'  },
  { label: 'Archive Data',  value: '1.3 TB', pct: 86, color: 'bg-red-500'    },
];

function StorageBar({ label, value, pct, color }: StorageItem) {
  return (
    <div>
      <div className='mb-1.5 flex items-center justify-between'>
        <span className='text-sm font-medium text-gray-800'>{label}</span>
        <span className='text-sm font-semibold text-gray-700'>{value}</span>
      </div>
      <div className='h-3 w-full overflow-hidden rounded-full bg-gray-100'>
        <div
          className={`h-3 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Storage() {
  return (
    <div className='flex flex-col gap-5'>

      {/* Page header */}
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Storage &amp; Retention</h2>
          <p className='mt-0.5 text-sm text-gray-500'>
            Balance uses, replication and compliance windows with clear policy controls
          </p>
        </div>
        <button className='rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'>
          Update Policy
        </button>
      </div>

      {/* Storage Breakdown */}
      <div className='rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
        <div className='mb-6'>
          <h3 className='text-sm font-semibold text-gray-900'>Storage Breakdown</h3>
          <p className='mt-0.5 text-xs text-gray-500'>Current footprint by platform</p>
        </div>
        <div className='flex flex-col gap-6'>
          {storageBreakdown.map((item) => (
            <StorageBar key={item.label} {...item} />
          ))}
        </div>
      </div>

    </div>
  );
}
