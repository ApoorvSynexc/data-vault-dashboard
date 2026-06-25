import { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { useAuthService } from '../../../services/auth/auth.service';
import { useAuth } from '../../../context/AuthContext';

export default function SocialLoginCallback() {
  const [searchParams] = useSearchParams();
  const authService = useAuthService();
  const { refreshProfile } = useAuth();

  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';
  const authProvider = searchParams.get('authProvider') ?? 'salesforce';
  const hasRequiredParams = Boolean(code && state);

  const { isLoading, error, isSuccess } = useQuery({
    queryKey: ['socialLoginCallback', authProvider, code, state],
    queryFn: () => authService.handleSocialLoginCallback(authProvider, code, state),
    enabled: hasRequiredParams,
  });

  useEffect(() => {
    if (isSuccess) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'SALESFORCE_LOGIN_SUCCESS' }, window.location.origin);
        window.close();
      } else {
        refreshProfile().then(() => {
          window.location.replace('/');
        });
      }
    }
  }, [isSuccess, refreshProfile]);

  useEffect(() => {
    if (error && window.opener && !window.opener.closed) {
      const message = error instanceof Error ? error.message : 'Unable to complete login. Please try again.';
      window.opener.postMessage({ type: 'SALESFORCE_LOGIN_ERROR', message }, window.location.origin);
      window.close();
    }
  }, [error]);

  useEffect(() => {
    if (!hasRequiredParams && window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'SALESFORCE_LOGIN_ERROR', message: 'Login link expired or invalid. Please try again.' }, window.location.origin);
      window.close();
    }
  }, [hasRequiredParams]);

  if (isSuccess && !(window.opener && !window.opener.closed)) {
    return <Navigate to='/' replace />;
  }
  

  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4'>
      <div className='w-full max-w-md'>
        {/* Loading State */}
        {isLoading && (
          <div className='animate-in fade-in duration-300'>
            <div className='rounded-2xl bg-white shadow-lg ring-1 ring-slate-200'>
              <div className='px-8 py-12 text-center'>
                {/* Animated Icon */}
                <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50'>
                  <div className='relative h-8 w-8'>
                    <svg className='absolute inset-0 animate-spin text-blue-600' fill='none' viewBox='0 0 24 24'>
                      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' opacity='0.1' />
                      <path
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                  </div>
                </div>

                <Typography as='h2' variant='pageTitle' className='mb-2'>
                  Completing Your Login
                </Typography>

                <Typography variant='body' className='mb-8 text-sm leading-relaxed text-slate-600'>
                  We're securely authenticating you through {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}. This should only take a moment.
                </Typography>

                {/* Progress Bar */}
                <div className='h-1 w-full overflow-hidden rounded-full bg-slate-100'>
                  <div className='h-full w-1/3 animate-pulse bg-gradient-to-r from-blue-500 to-indigo-500' />
                </div>
              </div>
            </div>

            {/* Trusted Badge */}
            <div className='mt-6 text-center text-xs text-slate-500'>
              <p>🔒 Your data is secure and encrypted</p>
            </div>
          </div>
        )}

        {/* Missing Parameters State */}
        {!hasRequiredParams && !isLoading && (
          <div className='animate-in fade-in duration-300'>
            <div className='rounded-2xl bg-white shadow-lg ring-1 ring-slate-200'>
              <div className='px-8 py-12 text-center'>
                <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50'>
                  <svg className='h-8 w-8 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4v2m0 0a9 9 0 110-18 9 9 0 010 18z' />
                  </svg>
                </div>

                <Typography as='h2' variant='pageTitle' className='mb-2'>
                  Login Link Expired
                </Typography>

                <Typography variant='body' className='mb-8 text-sm text-slate-600'>
                  The login link appears to be invalid or has expired. Please try logging in again.
                </Typography>

                <a
                  href='/login'
                  className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95'
                >
                  Back To Login
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className='animate-in fade-in duration-300'>
            <div className='rounded-2xl bg-white shadow-lg ring-1 ring-red-200'>
              <div className='px-8 py-12 text-center'>
                <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50'>
                  <svg className='h-8 w-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4v2m0 0a9 9 0 110-18 9 9 0 010 18z' />
                  </svg>
                </div>

                <Typography as='h2' variant='pageTitle' className='mb-2'>
                  Login Failed
                </Typography>

                <div className='mb-8 rounded-lg bg-red-50 px-4 py-3 text-left'>
                  <Typography variant='body' className='text-sm text-red-800'>
                    <span className='font-semibold'>Error:</span>{' '}
                    {error instanceof Error ? error.message : 'Unable to complete your login. Please try again.'}
                  </Typography>
                </div>

                <Typography variant='body' className='mb-6 text-xs text-slate-500'>
                  If this problem persists, please contact our support team.
                </Typography>

                <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
                  <a
                    href='/login'
                    className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95'
                  >
                    Try Again
                  </a>
                  <a
                    href='/'
                    className='inline-flex items-center justify-center rounded-lg bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 active:scale-95'
                  >
                    Go Home
                  </a>
                </div>
              </div>
            </div>

            {/* Support Help */}
            <div className='mt-6 rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-600 ring-1 ring-slate-200'>
              <p className='mb-2 font-semibold'>Need Help?</p>
              <p>Contact support at support@example.com or call 1-800-XXX-XXXX</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
