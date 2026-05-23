import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { usePlatformService } from '../../../services';

function BackToConnectionsButton() {
  const isPopup = window.opener && !window.opener.closed;

  if (isPopup) {
    return (
      <button
        type='button'
        onClick={() => {
          window.opener.postMessage({ type: 'SALESFORCE_CONNECT_SUCCESS' }, window.location.origin);
          window.close();
        }}
        className='mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700'
      >
        Back To Connections
      </button>
    );
  }

  return (
    <Link
      to='/connections/salesforce'
      className='mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700'
    >
      Back To Connections
    </Link>
  );
}

export default function SalesforceCallback() {
  const { callbackPlatform } = usePlatformService();
  const [searchParams] = useSearchParams();

  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';
  const errorParam = searchParams.get('error') ?? '';
  const errorDescription = searchParams.get('error_description') ?? '';
  const hasErrorParam = Boolean(errorParam);
  const hasRequiredParams = Boolean(code && state);

  const { isLoading, isSuccess, error } = useQuery({
    queryKey: ['platform-callback', 'salesforce', code, state],
    queryFn: () =>
      callbackPlatform({
        crmName: 'Salesforce',
        code,
        state,
      }),
    enabled: hasRequiredParams,
    retry: false,
  });

  if (isSuccess) {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'SALESFORCE_CONNECT_SUCCESS' }, window.location.origin);
      window.close();
      return null;
    }
    return <Navigate to='/connections/salesforce' replace />;
  }

  return (
    <div className='flex min-h-screen w-full flex-1 items-center justify-center bg-gray-50 p-6'>
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600'>
          {isLoading ? (
            <span className='h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent' />
          ) : (
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
              <path d='M12 8v4' strokeLinecap='round' />
              <circle cx='12' cy='16.5' r='0.8' fill='currentColor' stroke='none' />
              <path d='M10.29 3.86L1.82 18a2 2 0 001.72 3h16.92a2 2 0 001.72-3L13.71 3.86a2 2 0 00-3.42 0z' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          )}
        </div>

        <Typography as='h2' variant='pageTitle'>
          Salesforce Callback
        </Typography>

        {hasErrorParam ? (
          <>
            <Typography className='mt-2' variant='body' color='danger'>
              {errorDescription ? decodeURIComponent(errorDescription).replace(/\+/g, ' ') : `Authentication failed: ${errorParam}`}
            </Typography>
            <BackToConnectionsButton />
          </>
        ) : !hasRequiredParams ? (
          <>
            <Typography className='mt-2' variant='body' color='muted'>
              Missing required `code` or `state` query parameters.
            </Typography>
            <BackToConnectionsButton />
          </>
        ) : isLoading ? (
          <Typography className='mt-2' variant='body' color='muted'>
            Completing Salesforce connection and redirecting you to Platforms...
          </Typography>
        ) : (
          <>
            <Typography className='mt-2' variant='body' color='danger'>
              {error instanceof Error ? error.message : 'Failed to complete Salesforce connection.'}
            </Typography>
            <BackToConnectionsButton /></>

        )}
      </div>
    </div>
  );
}
