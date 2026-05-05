import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';
import { usePlatformService } from '../../../services/platform/platform.service';

type Environment = 'production' | 'sandbox' | 'custom';

function SalesforceLogo() {
  return (
    <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-10 w-auto'>
      <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
      <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
      <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
      <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
      <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
    </svg>
  );
}

export default function ConnectSalesforceOrg() {
  const navigate = useNavigate();
  const platformService = usePlatformService();
  const [connectionName, setConnectionName] = useState('');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleConnect = async () => {
    if (!connectionName.trim()) {
      setError('Connection name is required');
      return;
    }

    if (environment === 'custom') {
      if (!customUrl.trim()) {
        setError('Custom Salesforce URL is required');
        return;
      }
      if (!isValidUrl(customUrl)) {
        setError('Invalid URL format. Please enter a valid Salesforce instance URL');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Store connection details in session storage
      const connectionDetails = {
        connectionName,
        environment,
        customUrl: environment === 'custom' ? customUrl : undefined,
      };
      sessionStorage.setItem('salesforceConnectionDetails', JSON.stringify(connectionDetails));

      const response = await platformService.connectPlatform('Salesforce', {
        environment,
        customUrl: environment === 'custom' ? customUrl : undefined,
      });

      if (typeof response === 'string') {
        window.location.href = response;
      } else if (response && typeof response === 'object' && 'redirectUrl' in response) {
        window.location.href = (response as any).redirectUrl;
      } else {
        setError('Failed to get Salesforce authorization URL');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate Salesforce connection');
      setIsLoading(false);
    }
  };

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-2 text-sm'>
        <button
          onClick={() => navigate('/connections/salesforce')}
          className='text-gray-600 hover:text-gray-900 hover:underline'
        >
          Backup Management
        </button>
        <span className='text-gray-400'>›</span>
        <span className='font-semibold text-gray-900'>New Backup</span>
      </div>

      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => navigate('/connections/salesforce')}
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
              <SalesforceLogo />
            </div>
            <div>
              <Typography as='h1' variant='pageTitle' className='mb-1'>
                Connect Salesforce Org
              </Typography>
              <Typography variant='body' color='muted'>
                Add a new Salesforce org to protect and manage
              </Typography>
            </div>
          </div>
        </div>
      </section>

      <div className='grid grid-cols-3 gap-6'>
        {/* Form Section */}
        <section className='col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
          <div className='mb-6'>
            <Typography as='h2' variant='sectionTitle' className='mb-4'>
              1. Connection Details
            </Typography>
            <Typography variant='bodySm' color='muted' className='mb-6'>
              Enter a name to identify this Salesforce Org
            </Typography>

            {/* Connection Name */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-900'>
                * Connection Name
              </label>
              <input
                type='text'
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder='E.g., Salesforce US Sandbox'
                className='mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              />
              <p className='mt-2 text-xs text-gray-500'>
                A friendly name to identify this org in 360 DataVault
              </p>
            </div>

            {/* Environment */}
            <div>
              <label className='block text-sm font-semibold text-gray-900'>
                * Environment
              </label>
              <div className='mt-3 space-y-3'>
                {/* Production */}
                <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50'>
                  <input
                    type='radio'
                    name='environment'
                    value='production'
                    checked={environment === 'production'}
                    onChange={(e) => setEnvironment(e.target.value as Environment)}
                    className='mt-1'
                  />
                  <div>
                    <p className='font-medium text-gray-900'>Production</p>
                    <p className='text-xs text-gray-500'>
                      Connect to your live Salesforce environment
                    </p>
                  </div>
                </label>

                {/* Sandbox */}
                <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50'>
                  <input
                    type='radio'
                    name='environment'
                    value='sandbox'
                    checked={environment === 'sandbox'}
                    onChange={(e) => setEnvironment(e.target.value as Environment)}
                    className='mt-1'
                  />
                  <div>
                    <p className='font-medium text-gray-900'>Sandbox</p>
                    <p className='text-xs text-gray-500'>
                      Connect to your Salesforce sandbox environment
                    </p>
                  </div>
                </label>

                {/* Custom URL */}
                <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50'>
                  <input
                    type='radio'
                    name='environment'
                    value='custom'
                    checked={environment === 'custom'}
                    onChange={(e) => setEnvironment(e.target.value as Environment)}
                    className='mt-1'
                  />
                  <div className='flex-1'>
                    <p className='font-medium text-gray-900'>Custom URL</p>
                    <p className='text-xs text-gray-500'>
                      Connect to Salesforce with Custom URL
                    </p>
                    {environment === 'custom' && (
                      <input
                        type='text'
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder='Enter custom URL'
                        className='mt-3 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className='mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800'>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className='flex justify-end gap-3 border-t border-gray-200 pt-6'>
            <button
              type='button'
              onClick={() => navigate('/connections/salesforce')}
              disabled={isLoading}
              className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleConnect}
              disabled={!connectionName.trim() || isLoading}
              className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isLoading && (
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
              )}
              {isLoading ? 'Connecting...' : 'Connect to Salesforce'}
            </button>
          </div>
        </section>

        {/* Info Section */}
        <aside className='flex flex-col gap-4'>
          {/* What to Expect */}
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2'>
              <svg viewBox='0 0 24 24' fill='#10B981' className='h-5 w-5 shrink-0'>
                <circle cx='12' cy='12' r='10' />
              </svg>
              <Typography as='h3' variant='sectionTitle'>
                What to Expect
              </Typography>
            </div>

            <ul className='space-y-3'>
              {[
                'Secure OAuth 2.0 authentications',
                'Read only access to your data',
                'No write or delete permission',
                'Your data is encrypted in transit and at rest',
              ].map((item, index) => (
                <li key={index} className='flex gap-2.5'>
                  <svg viewBox='0 0 20 20' fill='#10B981' className='h-5 w-5 shrink-0'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-sm text-gray-700'>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* You will be able to */}
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <Typography as='h3' variant='sectionTitle' className='mb-4'>
              You will be able to :
            </Typography>

            <ul className='space-y-3'>
              {[
                'Backup Salesforce data automatically',
                'Restore data when needed',
                'Monitor backup health and history',
              ].map((item, index) => (
                <li key={index} className='flex gap-3'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5 shrink-0 text-blue-600'>
                    <circle cx='12' cy='12' r='10' />
                    <path d='M8 12l2 2 4-4' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                  <span className='text-sm text-gray-700'>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Good to Know */}
          <section className='rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm'>
            <div className='flex gap-3'>
              <svg viewBox='0 0 24 24' fill='#2563EB' className='h-5 w-5 shrink-0'>
                <circle cx='12' cy='12' r='10' />
                <path d='M12 16v-4M12 8h.01' stroke='white' strokeWidth='2' strokeLinecap='round' />
              </svg>
              <div>
                <Typography as='h4' variant='sectionTitle' className='mb-2 text-blue-900'>
                  Good to Know
                </Typography>
                <p className='text-xs text-blue-800'>
                  Each Salesforce org is backed up independently with separate schedule, retention policies and storage
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
