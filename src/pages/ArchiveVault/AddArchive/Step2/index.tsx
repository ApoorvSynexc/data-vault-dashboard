import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProgressBar from '../ProgressBar';

interface Step2Props {
  archiveSource?: string;
  destination?: string;
  initialPolicyName?: string;
  initialDescription?: string;
  onNext?: (policyName: string, description: string) => void;
  onBack?: () => void;
}

export default function AddArchiveStep2({
  archiveSource = 'Salesforce Production',
  destination = 'AWS S3',
  initialPolicyName,
  initialDescription = '',
  onNext,
  onBack,
}: Step2Props) {
  const navigate = useNavigate();

  const defaultPolicyName = `Accounts-Contact-Opportunity Archive – ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const [policyName, setPolicyName] = useState(initialPolicyName ?? defaultPolicyName);
  const [description, setDescription] = useState(initialDescription);

  const canProceed = policyName.trim().length > 0;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-6 min-h-0 gap-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
            Archive Vault
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
        </div>

        {/* Progress bar */}
        <ProgressBar activeStep={2} />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Define Archive</h1>
            <p className='text-gray-600 mt-1'>Define archive and storage tier</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step <span className='text-blue-600'>2</span> of 6
          </span>
        </div>

        {/* Form */}
        <div className='bg-white rounded-xl p-6 flex flex-col gap-6 flex-shrink-0'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Row 1: Archive Source + Destination */}
          <div className='grid grid-cols-2 gap-6'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Archive Source</span>
              </label>
              <input
                type='text'
                value={archiveSource}
                readOnly
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none cursor-default'
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Destination</span>
              </label>
              <input
                type='text'
                value={destination}
                readOnly
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none cursor-default'
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              />
            </div>
          </div>

          {/* Row 2: Archive Policy Name + Archive Description */}
          <div className='grid grid-cols-2 gap-6'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Archive Policy Name</span>
              </label>
              <input
                type='text'
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder='Enter archive policy name'
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-gray-700'>
                Archive Description <span className='text-gray-400 font-normal'>(Optional)</span>
              </label>
              <input
                type='text'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=''
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/archive-vault')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={() => onNext?.(policyName, description)}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${canProceed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
