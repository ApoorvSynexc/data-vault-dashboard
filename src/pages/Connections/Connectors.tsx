import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SalesforceConnections from './source/SalesforceConnections';
import AWSConnections from './destination/AWSConnections';

type Tab = 'source' | 'destination';

export default function Connectors() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const canSource      = hasPermission('sourceConnection');
  const canDestination = hasPermission('destinationConnection');

  const allTabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'source',      label: 'Source Platforms',      visible: canSource      },
    { id: 'destination', label: 'Destination Platforms', visible: canDestination },
  ];
  const tabs = allTabs.filter((t) => t.visible);

  const initialTab: Tab = (location.state as { tab?: Tab } | null)?.tab
    ?? (canSource ? 'source' : 'destination');
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className='flex w-full min-w-0 flex-col flex-1 min-h-0 overflow-hidden bg-gray-50'>

      {/* ── Header card ── */}
      <div className='flex-shrink-0 p-4 sm:px-6 sm:pt-6 sm:pb-0'>
        <div className='rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm'>
          <h2 className='text-base font-bold text-gray-900'>Connections</h2>
          <p className='text-sm text-gray-500 mt-0.5'>Manage your source and destination platform connections</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className='flex-shrink-0 bg-white border-b border-gray-200 px-6 mt-4 mx-4 sm:mx-6 rounded-t-xl border border-gray-200'>
        <div className='flex gap-8'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'py-4 text-sm font-semibold transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className='flex-1 min-h-0 flex flex-col'>
        {activeTab === 'source'      && <SalesforceConnections hideHeader />}
        {activeTab === 'destination' && <AWSConnections hideHeader />}
      </div>

    </div>
  );
}
