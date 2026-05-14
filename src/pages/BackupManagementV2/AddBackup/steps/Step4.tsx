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
  const [acceptanceText, setAcceptanceText] = useState('');
  const [acceptanceError, setAcceptanceError] = useState(false);
  const [policyNameError, setPolicyNameError] = useState(false);

  const isRealTime = strategy === 'realtime';
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

    if (isRealTime) {
      if (acceptanceText.toLowerCase() !== 'accept') {
        setAcceptanceError(true);
        return;
      }
      setAcceptanceError(false);
    }
    onNext(policyName, description);
  };

  return (
    <div className='h-full bg-gray-50 p-8 overflow-y-auto'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Define Backup Policy</h1>
          <p className='text-gray-600 mt-2'>Fill in the required information to create a backup policy</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 4 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-2 gap-8 mb-8'>
        {/* Backup Source */}
        <div>
          <label className='block text-sm font-semibold text-gray-900 mb-2'>
            <span className='text-red-500'>*</span> Backup Source
          </label>
          <input
            type='text'
            value='Salesforce Production'
            disabled
            className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
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
            className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
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
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
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
            Backup {isRealTime ? 'Description' : 'Descriptions'} (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
            rows={4}
          />
        </div>
      </div>

      {/* Real-Time Sync Specific Content */}
      {isRealTime && (
        <div className='bg-white rounded-lg border border-gray-200 p-6 mb-8'>
          <h3 className='text-base font-bold text-gray-900 mb-1'>Before You Proceed — Real-Time Sync Backup</h3>
          <p className='text-sm text-gray-600 mb-5'>
            DataVault uses Salesforce Apex Triggers to capture record changes instantly and sync them to your backup destination in real time.
          </p>

          <p className='text-sm font-semibold text-gray-800 mb-3'>What will happen after you save this backup configuration:</p>

          <ul className='text-sm text-gray-700 space-y-3 mb-5'>
            <li className='flex gap-2'>
              <span className='mt-0.5 shrink-0 text-blue-600'>•</span>
              <span>An <span className='font-semibold'>Apex Trigger</span> will be created on each object you selected (e.g. Account, Contact, Lead) to listen for <span className='font-semibold'>insert, update, delete,</span> and <span className='font-semibold'>undelete</span> events.</span>
            </li>
            <li className='flex gap-2'>
              <span className='mt-0.5 shrink-0 text-blue-600'>•</span>
              <span>A Permission Set named <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> will be created in your Salesforce org and will be granted access to the DataVault handler class and the triggers created above.</span>
            </li>
            <li className='flex gap-2'>
              <span className='mt-0.5 shrink-0 text-blue-600'>•</span>
              <span><span className='font-semibold'>Action required from you:</span> Please assign the <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> Permission Set to all users who create, update, or delete records on the selected objects. Without this assignment, those users' record changes may not be captured by the real-time backup.</span>
            </li>
            <li className='flex gap-2'>
              <span className='mt-0.5 shrink-0 text-blue-600'>•</span>
              <span><span className='font-semibold'>Already using Real-Time Backup on this Salesforce org?</span> No duplicate triggers or permission sets will be created. DataVault will only create triggers for newly added objects. Existing triggers and the <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> Permission Set will remain untouched.</span>
            </li>
          </ul>

          {/* Acknowledgment notice */}
          <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-5 rounded-r-lg'>
            <p className='text-sm text-yellow-800'>
              By saving this configuration, you acknowledge that DataVault will deploy <span className='font-semibold'>Apex Triggers</span> and a <span className='font-semibold'>Permission Set</span> to your connected Salesforce org as described above.
            </p>
          </div>

          {/* Acceptance Input */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-1'>
              Confirm to proceed
            </label>
            <p className='text-sm text-gray-600 mb-2'>
              Type <span className='font-semibold'>Accept</span> in the field below to acknowledge and save your Real-Time Backup configuration.
            </p>
            <input
              type='text'
              value={acceptanceText}
              onChange={(e) => {
                setAcceptanceText(e.target.value);
                if (acceptanceError && e.target.value.toLowerCase() === 'accept') {
                  setAcceptanceError(false);
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                acceptanceError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder='Type Accept here'
            />
            {acceptanceError && (
              <p className='text-sm text-red-600 mt-2'>Please type "Accept" to proceed</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex justify-between'>
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
