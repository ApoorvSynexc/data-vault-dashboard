import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

const MOCK_S3_BUCKETS = [
  'datavault-backup-prod',
  'datavault-backup-staging',
  'company-data-bucket',
];

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
  const [connectName, setConnectName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [s3Bucket, setS3Bucket] = useState('');
  const [folderPath, setFolderPath] = useState('');

  const handleConnect = () => {
    // TODO: Implement AWS connection logic
    console.log({
      connectName,
      accessKeyId,
      secretAccessKey,
      region,
      s3Bucket,
      folderPath,
    });
    // Navigate back to AWS connections
    navigate('/connections/aws');
  };

  const isFormValid = connectName.trim() && accessKeyId.trim() && secretAccessKey.trim() && s3Bucket;

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => navigate('/connections/aws')}
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
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </div>

              {/* Select S3 Bucket */}
              <div>
                <label className='block text-sm font-semibold text-gray-900'>
                  * Select S3 Bucket
                </label>
                <select
                  value={s3Bucket}
                  onChange={(e) => setS3Bucket(e.target.value)}
                  className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                >
                  <option value=''>Type or select from existing</option>
                  {MOCK_S3_BUCKETS.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucket}
                    </option>
                  ))}
                </select>
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
                  {AWS_REGIONS.map((reg) => (
                    <option key={reg.value} value={reg.value}>
                      {reg.label}
                    </option>
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

        {/* Connect Button */}
        <div className='flex justify-center border-t border-gray-200 pt-8'>
          <button
            type='button'
            onClick={handleConnect}
            disabled={!isFormValid}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-16 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            Connect
            <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
              <path d='M7 10h10M15 7l3 3-3 3' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
