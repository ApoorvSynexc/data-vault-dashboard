import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Step4Props = {
  onNext: (policyName: string, description: string) => void;
  onBack: () => void;
  strategy?: 'realtime' | 'scheduled';
  policyName?: string;
  description?: string;
};

export default function Step4({ onNext, onBack, strategy = 'realtime', policyName: initialPolicyName = '', description: initialDescription = '' }: Step4Props) {
  const navigate = useNavigate();
  const [policyName, setPolicyName] = useState(initialPolicyName);
  const [description, setDescription] = useState(initialDescription);
  const [policyNameError, setPolicyNameError] = useState(false);


  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  const handleNext = () => {
    if (!policyName.trim()) {
      setPolicyNameError(true);
      return;
    }
    setPolicyNameError(false);
    onNext(policyName, description);
  };

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
            Step 4 of {maxSteps}
          </span>
        </div>

        {/* Main Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Backup Source */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-2'>
              <span className='text-red-500'>*</span> Backup Source
            </label>
            <input
              type='text'
              value='Salesforce Production'
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
              value='AWS S3'
              disabled
              className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
            />
          </div>

          {/* Backup Policy Name */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-2'>
              <span className='text-red-500'>*</span> Backup Policy Name
            </label>
            <input
              type='text'
              value={policyName}
              onChange={(e) => {
                setPolicyName(e.target.value);
                if (policyNameError && e.target.value.trim()) {
                  setPolicyNameError(false);
                }
              }}
              placeholder='Enter backup policy name'
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                policyNameError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {policyNameError && (
              <p className='text-sm text-red-600 mt-2'>Backup Policy Name is required</p>
            )}
          </div>

          {/* Backup Description */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-2'>
              Backup Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
              rows={4}
            />
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
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={!policyName.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              policyName.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
