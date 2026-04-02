import Typography from '../../../../components/Typography';
import type { BackupFieldErrors } from '../../../../validation/backup.validation';
import { SelectChevron } from '../components';

type DestinationStepProps = {
  destination: 'S3' | 'Google' | 'Azure';
  googleConfig: {
    serviceAccountKey: string;
    bucketName: string;
    projectId: string;
  };
  azureConfig: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
  s3Config: {
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region: string;
  };
  stepErrors: BackupFieldErrors;
  fieldClass: (error?: string, isSelect?: boolean) => string;
  onDestinationChange: (value: 'S3' | 'Google' | 'Azure') => void;
  onS3ConfigChange: (patch: Partial<DestinationStepProps['s3Config']>) => void;
  onGoogleConfigChange: (patch: Partial<DestinationStepProps['googleConfig']>) => void;
  onAzureConfigChange: (patch: Partial<DestinationStepProps['azureConfig']>) => void;
  onClearError: (field: string) => void;
};

export function DestinationStep({
  destination,
  googleConfig,
  azureConfig,
  s3Config,
  stepErrors,
  fieldClass,
  onDestinationChange,
  onS3ConfigChange,
  onGoogleConfigChange,
  onAzureConfigChange,
  onClearError,
}: DestinationStepProps) {
  return (
    <>
      <Typography as='h2' variant='pageTitle' className='font-semibold'>
        Destination
      </Typography>
      <Typography className='mt-1' variant='bodySm' color='muted'>
        Choose where your backup data will be stored.
      </Typography>

      <div className='mt-6'>
        <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
          {(['S3', 'Google', 'Azure'] as const).map((option) => (
            <button
              key={option}
              type='button'
              onClick={() => onDestinationChange(option)}
              className={[
                'min-w-[96px] border-r border-blue-600 px-5 py-2 text-xs font-medium transition last:border-r-0',
                destination === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
              ].join(' ')}
            >
              {option === 'S3' ? 'Amazon S3' : option === 'Google' ? 'Google Cloud' : 'Azure Blob'}
            </button>
          ))}
        </div>

        <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2'>
          {destination === 'S3' && (
            <>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Access Key ID
                </Typography>
                <input type='text' value={s3Config.accessKeyId} onChange={(e) => { onS3ConfigChange({ accessKeyId: e.target.value }); onClearError('accessKeyId'); }} placeholder='AKIAIOSFODNN7EXAMPLE' className={fieldClass(stepErrors.accessKeyId)} />
                {stepErrors.accessKeyId && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.accessKeyId}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Secret Access Key
                </Typography>
                <input type='password' value={s3Config.secretAccessKey} onChange={(e) => { onS3ConfigChange({ secretAccessKey: e.target.value }); onClearError('secretAccessKey'); }} placeholder='********************' className={fieldClass(stepErrors.secretAccessKey)} />
                {stepErrors.secretAccessKey && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.secretAccessKey}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Bucket Name
                </Typography>
                <input type='text' value={s3Config.bucketName} onChange={(e) => { onS3ConfigChange({ bucketName: e.target.value }); onClearError('bucketName'); }} placeholder='my-backup-bucket' className={fieldClass(stepErrors.bucketName)} />
                {stepErrors.bucketName && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.bucketName}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Region
                </Typography>
                <div className='relative'>
                  <select value={s3Config.region} onChange={(e) => { onS3ConfigChange({ region: e.target.value }); onClearError('region'); }} className={fieldClass(stepErrors.region, true)}>
                    <option value=''>Select region</option>
                    <option value='us-east-1'>us-east-1</option>
                    <option value='us-west-2'>us-west-2</option>
                    <option value='eu-west-1'>eu-west-1</option>
                    <option value='ap-south-1'>ap-south-1</option>
                  </select>
                  <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                </div>
                {stepErrors.region && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.region}</Typography>}
              </label>
            </>
          )}

          {destination === 'Google' && (
            <>
              <label className='block md:col-span-2'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Service Account Key (JSON)
                </Typography>
                <textarea value={googleConfig.serviceAccountKey} onChange={(e) => { onGoogleConfigChange({ serviceAccountKey: e.target.value }); onClearError('serviceAccountKey'); }} placeholder='Paste your service account JSON here...' rows={4} className={['w-full rounded-lg border px-4 py-3 font-mono text-xs text-gray-800 outline-none transition focus:ring-2', stepErrors.serviceAccountKey ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'].join(' ')} />
                {stepErrors.serviceAccountKey && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.serviceAccountKey}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Bucket Name
                </Typography>
                <input type='text' value={googleConfig.bucketName} onChange={(e) => { onGoogleConfigChange({ bucketName: e.target.value }); onClearError('bucketName'); }} placeholder='my-gcs-bucket' className={fieldClass(stepErrors.bucketName)} />
                {stepErrors.bucketName && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.bucketName}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Project ID
                </Typography>
                <input type='text' value={googleConfig.projectId} onChange={(e) => { onGoogleConfigChange({ projectId: e.target.value }); onClearError('projectId'); }} placeholder='my-gcp-project-id' className={fieldClass(stepErrors.projectId)} />
                {stepErrors.projectId && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.projectId}</Typography>}
              </label>
            </>
          )}

          {destination === 'Azure' && (
            <>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Account Name
                </Typography>
                <input type='text' value={azureConfig.accountName} onChange={(e) => { onAzureConfigChange({ accountName: e.target.value }); onClearError('accountName'); }} placeholder='mystorageaccount' className={fieldClass(stepErrors.accountName)} />
                {stepErrors.accountName && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.accountName}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Account Key
                </Typography>
                <input type='password' value={azureConfig.accountKey} onChange={(e) => { onAzureConfigChange({ accountKey: e.target.value }); onClearError('accountKey'); }} placeholder='********************' className={fieldClass(stepErrors.accountKey)} />
                {stepErrors.accountKey && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.accountKey}</Typography>}
              </label>
              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Container Name
                </Typography>
                <input type='text' value={azureConfig.containerName} onChange={(e) => { onAzureConfigChange({ containerName: e.target.value }); onClearError('containerName'); }} placeholder='backup-container' className={fieldClass(stepErrors.containerName)} />
                {stepErrors.containerName && <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.containerName}</Typography>}
              </label>
            </>
          )}
        </div>
      </div>
    </>
  );
}
