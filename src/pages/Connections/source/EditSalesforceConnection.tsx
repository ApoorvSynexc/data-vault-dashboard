import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { usePlatformService } from '../../../services/platform/platform.service';

export default function EditSalesforceConnection() {
  const navigate = useNavigate();
  const { crmId } = useParams<{ crmId: string }>();
  const queryClient = useQueryClient();
  const platformService = usePlatformService();
  const [connectionName, setConnectionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: allPlatforms, isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });

  const selectedPlatform = allPlatforms?.find(
    (platform) => platform.crmId === crmId && platform.crmName.toLowerCase() === 'salesforce'
  );

  useEffect(() => {
    if (selectedPlatform) {
      setConnectionName(selectedPlatform.name || '');
    }
  }, [selectedPlatform]);

  const updateMutation = useMutation({
    mutationFn: () => platformService.updatePlatform(crmId!, connectionName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      navigate('/connections');
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to update connection name');
    },
  });

  const handleSave = () => {
    if (!connectionName.trim()) {
      setError('Connection name cannot be empty');
      return;
    }
    setError(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600' />
      </div>
    );
  }

  if (!selectedPlatform) {
    return (
      <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center'>
        <p className='text-sm font-medium text-gray-500'>Connection not found</p>
        <button
          onClick={() => navigate('/connections')}
          className='mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
        >
          Back to Connections
        </button>
      </div>
    );
  }

  return (
    <div className='flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 bg-gray-50 flex-1 min-h-0 overflow-y-auto'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-2 text-sm'>
        <button
          onClick={() => navigate('/connections')}
          className='text-gray-600 hover:text-gray-900 hover:underline'
        >
          Connections
        </button>
        <span className='text-gray-400'>›</span>
        <button
          onClick={() => navigate('/connections')}
          className='text-gray-600 hover:text-gray-900 hover:underline'
        >
          Salesforce
        </button>
        <span className='text-gray-400'>›</span>
        <span className='font-semibold text-gray-900'>Edit Connection</span>
      </div>

      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-4'>
            <button
              onClick={() => navigate('/connections')}
              className='mt-1 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='h-5 w-5'
              >
                <path d='M19 12H5M12 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
            <div>
              <Typography as='h1' variant='pageTitle' className='mb-1'>
                Edit Connection Name
              </Typography>
              <Typography variant='body' color='muted'>
                Update the name for {selectedPlatform.crmProfile.name}
              </Typography>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Form */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm max-w-2xl'>
        <div className='space-y-6'>
          {/* Connection Info */}
          <div>
            <p className='text-sm font-medium text-gray-600 mb-4'>Current Connection Details</p>
            <div className='space-y-3 rounded-lg bg-gray-50 p-4'>
              <div>
                <p className='text-xs text-gray-500'>Organization Name</p>
                <p className='text-sm font-medium text-gray-900'>{selectedPlatform.crmProfile.name}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Email</p>
                <p className='text-sm font-medium text-gray-900'>{selectedPlatform.crmProfile.email}</p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Username</p>
                <p className='text-sm font-medium text-gray-900'>{selectedPlatform.crmProfile.username}</p>
              </div>
            </div>
          </div>

          {/* Name Edit Field */}
          <div>
            <label className='block text-sm font-medium text-gray-900 mb-2'>
              Connection Name
            </label>
            <input
              type='text'
              value={connectionName}
              onChange={(e) => {
                setConnectionName(e.target.value);
                setError(null);
              }}
              className='w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Enter connection name'
            />
            <p className='text-xs text-gray-500 mt-1'>Give this connection a meaningful name for easy identification</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className='rounded-lg bg-red-50 border border-red-200 p-4'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-3 pt-4'>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => navigate('/connections')}
              disabled={updateMutation.isPending}
              className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
