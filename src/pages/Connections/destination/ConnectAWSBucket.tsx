import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Typography from '../../../components/Typography';
import { useDestinationService, type CreateDestinationPayload } from '../../../services/destination/destination.service';
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

export default function ConnectAWSBucket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/connections';
  const queryClient = useQueryClient();
  const destinationService = useDestinationService();
  const [connectName, setConnectName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [s3Bucket, setS3Bucket] = useState('');
  const [folderPath, setFolderPath] = useState('');

  const createDestinationMutation = useMutation({
    mutationFn: async (payload: CreateDestinationPayload) =>
      destinationService.createDestination(payload),
    onSuccess: (newDestination) => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      const separator = returnTo.includes('?') ? '&' : '?';
      const idParam = newDestination?.destinationId ? `&newDestinationId=${newDestination.destinationId}` : '';
      navigate(`${returnTo}${separator}connected=true${idParam}`, { state: { tab: 'destination' } });
    },
    onError: (error: any) => {
      console.error('Failed to create destination:', error);
    },
  });

  const handleConnect = async () => {
    if (!isFormValid) return;

    const payload: CreateDestinationPayload = {
      name: connectName,
      provider: 'AWS',
      type: 'S3',
      config: {
        bucketName: s3Bucket,
        region,
        accessKeyId,
        secretAccessKey,
        ...(folderPath && { folderPath }),
      },
    };

    createDestinationMutation.mutate(payload);
  };

  const isFormValid = connectName.trim() && accessKeyId.trim() && secretAccessKey.trim() && s3Bucket.trim();

  return (
    <div className='flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 bg-gray-50 flex-1 min-h-0 overflow-y-auto'>
      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => navigate(returnTo, { state: { tab: 'destination' } })}
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
                Connect to AWS
              </Typography>
              <Typography variant='body' color='muted'>
                Add a new AWS connection to store your data
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
            Configure your AWS connection
          </Typography>

          {/* Form Grid */}
          <div className='grid grid-cols-2 gap-6'>
            {/* Left Column */}
            <div className='space-y-6'>
              {/* Connect Name */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Connect Name
                </label>
                <input
                  type='text'
                  value={connectName}
                  onChange={(e) => setConnectName(e.target.value)}
                  placeholder='Enter any name to recognize your destination point'
                  autoComplete='off'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>

              {/* Secret Access Key */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Secret Access Key
                </label>
                <input
                  type='password'
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder='Enter your AWS access Key'
                  autoComplete='new-password'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>

              {/* Select S3 Bucket */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Select S3 Bucket
                </label>
                <input
                  type='text'
                  value={s3Bucket}
                  onChange={(e) => setS3Bucket(e.target.value)}
                  placeholder='Enter your S3 bucket name'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>
            </div>

            {/* Right Column */}
            <div className='space-y-6'>
              {/* Access Key ID */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Access Key ID
                </label>
                <input
                  type='text'
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder='Enter your AWS access Key'
                  autoComplete='off'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>

              {/* Region */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
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

              {/* Folder Path */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  Folder Path (Optional)
                </label>
                <input
                  type='text'
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder='Specify a folder path within a bucket'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {createDestinationMutation.isError && (
          <div className='mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3'>
            <svg className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-500' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <circle cx='12' cy='12' r='10' /><path d='M12 8v4M12 16h.01' strokeLinecap='round' />
            </svg>
            <p className='text-sm text-red-600'>
              {(createDestinationMutation.error as any)?.message || 'Failed to connect. Please check your credentials and try again.'}
            </p>
          </div>
        )}

        {/* Connect Button */}
        <div className='flex justify-center border-t border-gray-200 pt-8'>
          <button
            type='button'
            onClick={handleConnect}
            disabled={!isFormValid || createDestinationMutation.isPending}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-16 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {createDestinationMutation.isPending ? 'Connecting...' : 'Connect'}
            {!createDestinationMutation.isPending && (
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
