import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Typography from '../../../components/Typography';
import { useDestinationService, type UpdateDestinationPayload } from '../../../services/destination/destination.service';
import { getRegionsByGroup } from '../../../constants/aws-regions';

function AWSLogo() {
  return (
    <svg viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-10 w-auto'>
      <text x='50' y='40' fontSize='32' fontWeight='bold' fill='#FF9900' textAnchor='middle'>
        aws
      </text>
    </svg>
  );
}

export default function EditAWSBucket() {
  const { destinationId } = useParams<{ destinationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const destinationService = useDestinationService();

  const [connectName, setConnectName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [s3Bucket, setS3Bucket] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: destination, isLoading: isLoadingDestination } = useQuery({
    queryKey: ['destination', destinationId],
    queryFn: () => destinationService.getDestination(destinationId!),
    enabled: !!destinationId,
  });

  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['destination-config', destinationId],
    queryFn: () => destinationService.getDecryptedConfig(destinationId!),
    enabled: !!destinationId,
  });

  useEffect(() => {
    if (destination) {
      setConnectName(destination.name);
    }
    if (config) {
      setAccessKeyId(config.accessKeyId || '');
      setSecretAccessKey(config.secretAccessKey || '');
      setRegion(config.region || 'us-east-1');
      setS3Bucket(config.bucketName || '');
      setFolderPath(config.folderPath || '');
    }
  }, [destination, config]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateDestinationPayload) =>
      destinationService.updateDestination(destinationId!, {
        ...payload, 
        provider: destination?.provider,
        name: destination?.name,

      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination', destinationId] });
      navigate('/connections', { state: { tab: 'destination' } });
    },
    onError: (error) => {
      console.error('Failed to update destination:', error);
    },
  });

  const handleUpdate = async () => {
    if (!isFormValid) return;

    const payload: UpdateDestinationPayload = {
      name: connectName,
      provider: destination?.provider || 'AWS',
      type: destination?.type || 'S3',
      config: {
        bucketName: s3Bucket,
        region,
        accessKeyId,
        secretAccessKey,
        ...(folderPath && { folderPath }),
      },
    };

    updateMutation.mutate(payload);
  };

  const isFormValid = accessKeyId.trim() && secretAccessKey.trim();

  if (isLoadingDestination || isLoadingConfig) {
    return (
      <div className='flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 bg-gray-50 flex-1 min-h-0 overflow-y-auto'>
        <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-gray-500'>Loading destination details...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className='flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 bg-gray-50 flex-1 min-h-0 overflow-y-auto'>
      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => navigate('/connections', { state: { tab: 'destination' } })}
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
          <div className='flex items-start gap-3'>
            <div className='mt-1'>
              <AWSLogo />
            </div>
            <div>
              <Typography as='h1' variant='pageTitle' className='mb-1'>
                Edit AWS Connection
              </Typography>
              <Typography variant='body' color='muted'>
                Update your AWS S3 connection details
              </Typography>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
        <div className='mb-8'>
          <Typography as='h2' variant='sectionTitle' className='mb-6'>
            AWS S3 Configurations
          </Typography>
          <Typography variant='bodySm' color='muted' className='mb-6'>
            Update your AWS connection settings
          </Typography>

          {/* Info Box */}
          <div className='mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4'>
            <p className='text-sm text-blue-900'>
              <span className='font-semibold'>Note:</span> Once a destination is created, only the Access Key ID and Secret Access Key can be modified. Other details are locked to maintain connection integrity.
            </p>
          </div>

          {/* Form Grid */}
          <div className='grid grid-cols-2 gap-6'>
            {/* Left Column */}
            <div className='space-y-6'>
              {/* Connect Name - Disabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  Connect Name
                </label>
                <input
                  type='text'
                  value={connectName}
                  disabled
                  placeholder='Enter any name to recognize your destination point'
                  className='mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none'
                />
              </div>

              {/* Secret Access Key - Enabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Secret Access Key
                </label>
                <div className='relative mt-2'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    placeholder='Enter your AWS secret key'
                    className='w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                        <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' strokeLinecap='round' strokeLinejoin='round' />
                        <circle cx='12' cy='12' r='3' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    ) : (
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                        <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' strokeLinecap='round' strokeLinejoin='round' />
                        <line x1='1' y1='1' x2='23' y2='23' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Select S3 Bucket - Disabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  S3 Bucket
                </label>
                <input
                  type='text'
                  value={s3Bucket}
                  disabled
                  placeholder='Enter your S3 bucket name'
                  className='mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none'
                />
              </div>
            </div>

            {/* Right Column */}
            <div className='space-y-6'>
              {/* Access Key ID - Enabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Access Key ID
                </label>
                <input
                  type='text'
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder='Enter your AWS access key ID'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>

              {/* Region - Disabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  Region
                </label>
                <select
                  value={region}
                  disabled
                  className='mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none'
                >
                  <option value=''>Select region</option>
                  {Array.from(getRegionsByGroup().entries()).map(([group, regions]) => (
                    <optgroup key={group} label={group}>
                      {regions.map((reg) => (
                        <option key={reg.value} value={reg.value}>
                          {reg.value} — {reg.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Folder Path - Disabled */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  Folder Path
                </label>
                <input
                  type='text'
                  value={folderPath}
                  disabled
                  placeholder='Specify a folder path within a bucket'
                  className='mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Update Button */}
        <div className='flex justify-center gap-4 border-t border-gray-200 pt-8'>
          <button
            type='button'
            onClick={() => navigate('/connections', { state: { tab: 'destination' } })}
            className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-16 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleUpdate}
            disabled={!isFormValid || updateMutation.isPending}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-16 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {updateMutation.isPending ? 'Updating...' : 'Update'}
            {!updateMutation.isPending && (
              <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                <path d='M7 10h10M15 7l3 3-3 3' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
