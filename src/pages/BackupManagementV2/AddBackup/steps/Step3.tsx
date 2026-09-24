import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NAME_MAX = 150;
const DESC_MAX = 400;

type Step3Props = {
  onNext: (policyName: string, description: string) => void;
  onBack: () => void;
  strategy?: 'realtime' | 'scheduled';
  sourceName?: string;
  destinationName?: string;
  policyName?: string;
  description?: string;
  onDone?: (policyName: string, description: string) => void;
};

export default function Step3({ onNext, onBack, strategy = 'realtime', sourceName = '', destinationName = '', policyName: initialPolicyName = '', description: initialDescription = '', onDone }: Step3Props) {
  const navigate = useNavigate();

  const [policyName, setPolicyName] = useState(initialPolicyName);
  const [description, setDescription] = useState(initialDescription);

  const maxSteps = strategy === 'realtime' ? 6 : 7;

  const handleNameChange = (val: string) => {
    if (val.length > NAME_MAX) return;
    setPolicyName(val);
  };

  const handleDescChange = (val: string) => {
    if (val.length > DESC_MAX) return;
    setDescription(val);
  };

  const handleNext = () => {
    if (!policyName.trim()) return;
    if (onDone) {
      onDone(policyName, description);
    } else {
      onNext(policyName, description);
    }
  };

  const canProceed = policyName.trim().length > 0;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      {/* Scrollable area */}
      <div className='flex-1 overflow-y-auto flex flex-col p-8 min-h-0'>
        {/* Header with Step Indicator */}
        <div className='flex items-start justify-between mb-8 flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Define Backup Policy</h1>
            <p className='text-gray-600 mt-2'>Fill in the required information to create a backup policy</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step 3 of {maxSteps}
          </span>
        </div>

        {/* Main Content */}
        <div className='bg-white rounded-xl p-6 flex flex-col flex-1 min-h-0'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Backup Source */}
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>
                <span className='text-red-500'>*</span> Backup Source
              </label>
              <input
                type='text'
                value={sourceName || '—'}
                disabled
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
              />
            </div>

            {/* Backup Destination */}
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>
                <span className='text-red-500'>*</span> Backup Destination
              </label>
              <input
                type='text'
                value={destinationName || '—'}
                disabled
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
              />
            </div>

            {/* Backup Policy Name */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-semibold text-gray-900'>
                  <span className='text-red-500'>*</span> Backup Policy Name
                </label>
                <span className={`text-[11px] tabular-nums ${policyName.length >= NAME_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {policyName.length}/{NAME_MAX}
                </span>
              </div>
              <input
                type='text'
                value={policyName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder='Enter backup policy name'
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            {/* Backup Description */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-semibold text-gray-900'>
                  Backup Description <span className='text-gray-400 font-normal'>(Optional)</span>
                </label>
                <span className={`text-[11px] tabular-nums ${description.length >= DESC_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => handleDescChange(e.target.value)}
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-8 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          {!onDone && (
            <button
              onClick={onBack}
              className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {onDone ? 'Save & Return →' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
