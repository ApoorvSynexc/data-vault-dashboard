import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

function CopyIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
      <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

const BUCKET_POLICY_TEMPLATE = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'DataVaultAthenaRoleAccess',
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::905418306846:role/DataVaultAthenaRole' },
        Action: ['s3:GetObject', 's3:ListBucket'],
        Resource: [
          'arn:aws:s3:::<YOUR_BUCKET_NAME>',
          'arn:aws:s3:::<YOUR_BUCKET_NAME>/*',
        ],
      },
    ],
  },
  null,
  2,
);

type AckOption = 'auto' | 'manual';

export default function ConnectAWSBucket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('returnTo') || '/connections';
  const returnTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/connections';
  const queryClient = useQueryClient();
  const destinationService = useDestinationService();

  const [connectName, setConnectName] = useState('');
  const [nameError, setNameError] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [s3Bucket, setS3Bucket] = useState('');
  const [folderPath, _setFolderPath] = useState('');
  const [showAck, setShowAck] = useState(false);
  const [ackOption, setAckOption] = useState<AckOption>('auto');
  const [copied, setCopied] = useState(false);

  const { data: existingDestinations } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => destinationService.listDestinations(),
  });

  const existingNames = (existingDestinations ?? []).map((d) => d.name.toLowerCase().trim());

  const handleNameChange = (value: string) => {
    setConnectName(value);
    if (existingNames.includes(value.toLowerCase().trim())) {
      setNameError('A connection with this name already exists. Please choose a different name.');
    } else {
      setNameError('');
    }
  };

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

  const isFormValid = connectName.trim() && accessKeyId.trim() && secretAccessKey.trim() && s3Bucket.trim() && !nameError;

  const handleConnectClick = () => {
    if (!isFormValid) return;
    setShowAck(true);
  };

  const handleConfirm = () => {
    const payload: CreateDestinationPayload = {
      name: connectName,
      provider: 'AWS',
      type: 'S3',
      is_already_granted: ackOption === 'manual',
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

  const handleCopyPolicy = () => {
    navigator.clipboard.writeText(BUCKET_POLICY_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className='flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 bg-gray-50 flex-1 min-h-0 overflow-y-auto'>
      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => navigate(returnTo, { state: { tab: 'destination' } })}
            className='mt-1 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
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
              <div>
                <label className='block text-sm font-semibold text-gray-900'>* Connect Name</label>
                <input
                  type='text'
                  value={connectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder='Enter any name to recognize your destination point'
                  autoComplete='off'
                  className={`mt-2 w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${nameError ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
                />
                {nameError && <p className='mt-1.5 text-xs text-red-600'>{nameError}</p>}
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900'>* Secret Access Key</label>
                <input
                  type='password'
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder='Enter your AWS secret access key'
                  autoComplete='new-password'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900'>* Select S3 Bucket</label>
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
              <div>
                <label className='block text-sm font-semibold text-gray-900'>* Access Key ID</label>
                <input
                  type='text'
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder='Enter your AWS access key ID'
                  autoComplete='off'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900'>* Region</label>
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
              <div>
                {/* <label className='block text-sm font-semibold text-gray-900'>Folder Path (Optional)</label> */}
                {/* <input
                  type='text'
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder='Specify a folder path within a bucket'
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                /> */}
              </div>
            </div>
          </div>
        </div>

        {/* Acknowledgement Panel — shown after clicking Connect */}
        {showAck && (
          <div className='mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6'>
            {/* Title */}
            <div className='flex items-center gap-2 mb-1'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5 text-blue-600 flex-shrink-0'>
                <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <h3 className='text-base font-semibold text-blue-900'>Grant Access to Your S3 Bucket</h3>
            </div>
            <p className='text-sm text-blue-700 mb-5 leading-relaxed'>
              To enable 360 Data Vault to query your data using Amazon Athena, your S3 bucket must grant access to the{' '}
              <span className='font-semibold'>360 Data Vault Athena Role</span>. Choose one of the following options:
            </p>

            <div className='flex flex-col gap-4'>
              {/* Option 1 */}
              <label
                className={`flex cursor-pointer gap-4 rounded-xl border-2 bg-white p-4 transition ${
                  ackOption === 'auto' ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type='radio'
                  name='ackOption'
                  value='auto'
                  checked={ackOption === 'auto'}
                  onChange={() => setAckOption('auto')}
                  className='mt-0.5 accent-blue-600'
                />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='text-sm font-semibold text-gray-900'>Option 1: Assign Role Automatically</span>
                    <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700'>Recommended</span>
                  </div>
                  <p className='text-sm text-gray-600'>
                    Click <span className='font-medium'>Assign Role & Connect</span>, and 360 Data Vault will automatically configure the required
                    permissions on your S3 bucket.
                  </p>
                </div>
              </label>

              {/* Option 2 */}
              <label
                className={`flex cursor-pointer gap-4 rounded-xl border-2 bg-white p-4 transition ${
                  ackOption === 'manual' ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type='radio'
                  name='ackOption'
                  value='manual'
                  checked={ackOption === 'manual'}
                  onChange={() => setAckOption('manual')}
                  className='mt-0.5 accent-blue-600'
                />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-900 mb-1'>Option 2: Configure Access Manually</p>
                  <p className='text-sm text-gray-600 mb-3'>
                    Add the following policy to your S3 Bucket Policy, replacing{' '}
                    <code className='rounded bg-gray-100 px-1 py-0.5 text-xs font-mono text-orange-600'>&lt;YOUR_BUCKET_NAME&gt;</code>{' '}
                    with your actual bucket name:
                  </p>

                  {ackOption === 'manual' && (
                    <div className='relative'>
                      <pre className='overflow-x-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-green-300 font-mono leading-relaxed'>
                        {BUCKET_POLICY_TEMPLATE}
                      </pre>
                      <button
                        type='button'
                        onClick={handleCopyPolicy}
                        className='absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-gray-700 px-2.5 py-1.5 text-xs text-gray-200 transition hover:bg-gray-600'
                      >
                        <CopyIcon />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

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

        {/* Action Buttons */}
        <div className='flex justify-center border-t border-gray-200 pt-8'>
          {!showAck ? (
            <button
              type='button'
              onClick={handleConnectClick}
              disabled={!isFormValid}
              className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-16 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Connect
              <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                <path d='M7 10h10M15 7l3 3-3 3' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
          ) : (
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => setShowAck(false)}
                disabled={createDestinationMutation.isPending}
                className='rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60'
              >
                Back
              </button>
              <button
                type='button'
                onClick={handleConfirm}
                disabled={createDestinationMutation.isPending}
                className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-10 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {createDestinationMutation.isPending
                  ? 'Connecting...'
                  : ackOption === 'auto'
                  ? 'Assign Role & Connect'
                  : 'Connect'}
                {!createDestinationMutation.isPending && (
                  <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                    <path d='M7 10h10M15 7l3 3-3 3' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
