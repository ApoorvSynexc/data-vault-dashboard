import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import LoginPagePicture from '../../../assets/icons/LoginPagePicture.svg';
import DataCraftIcon from '../../../assets/icons/Datavault Logo Container.svg';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';
import RecoverPasswordModal from '../RecoverPasswordModal';
import CustomURLModal from '../CustomURLModal';
import { useAuthService } from '../../../services/auth/auth.service';

export default function LoginV2() {
  const [searchParams] = useSearchParams();
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [isCustomURLModalOpen, setIsCustomURLModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(() => {
    // Check sessionStorage first (set by AuthContext when getMyProfile fails with 401/403)
    const stored = sessionStorage.getItem('loginError');
    if (stored) {
      sessionStorage.removeItem('loginError');
      return stored;
    }
    // Fall back to ?error= query param (set by SocialLoginCallback when opener is unavailable)
    const err = searchParams.get('error');
    if (!err) return null;
    const is401 = err.includes('401') || /unauthorized/i.test(err);
    return is401
      ? 'You do not have permission to access Data Craft. Please contact your administrator to request access.'
      : err;
  });
  const [errorType, setErrorType] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('loginErrorType');
    if (stored) { sessionStorage.removeItem('loginErrorType'); return stored; }
    return searchParams.get('errorType');
  });
  const authService = useAuthService();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (
        event.data?.type === 'SALESFORCE_LOGIN_SUCCESS' ||
        event.data?.type === 'SALESFORCE_CONNECT_SUCCESS'
      ) {
        window.location.replace('/');
      }
      if (event.data?.type === 'SALESFORCE_LOGIN_ERROR') {
        const raw: string = event.data.message ?? '';
        const is401 = raw.includes('401') || /unauthorized/i.test(raw);
        setErrorType(event.data.errorType ?? null);
        setLoginError(
          is401
            ? 'You do not have permission to access Data Craft. Please contact your administrator to request access.'
            : raw || 'Login failed. Please try again.'
        );
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const socialLoginMutation = useMutation({
    mutationFn: ({ environment }: { environment?: string }) =>
      authService.initiateSocialLogin('salesforce', undefined, environment),
  });

  const handleSalesforceLogin = (env: 'production' | 'sandbox') => {
    setLoginError(null);
    socialLoginMutation.mutate({ environment: env }, {
      onSuccess: (data) => {
        if (data?.authorizationUrl) {
          const url = new URL(data.authorizationUrl);
          url.searchParams.set('prompt', 'login');
          const width = 500;
          const height = 650;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          window.open(
            url.toString(),
            'SalesforceLogin',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
          );
        }
      },
      onError: (error) => {
        console.error('Login error:', error);
      },
    });
  };

  return (
    <div
      className='flex min-h-screen w-full flex-col lg:flex-row'
      style={{
        background: 'radial-gradient(ellipse at 65% -60%, #155DFC 0%, #5B8DFD 30%, #ffffff 62%)',
      }}
    >
      {/* ── Left side ── */}
      <div className='flex flex-1 flex-col justify-between px-8 py-8 sm:px-12 lg:px-16 xl:px-20'>

        {/* Logo + Card grouped together, centered vertically */}
        <div className='flex flex-1 items-center justify-start'>
          <div className='w-full max-w-xl'>

            {/* Logo directly above card */}
            <div className='flex items-center gap-3 mb-4'>
              <img src={DataCraftIcon} className='h-16 w-16 object-contain flex-shrink-0' alt='DataCraft' />
              <div>
                <p className='font-bold leading-tight' style={{ color: '#33363F', fontSize: 30 }}>360 DataCraft</p>
                <p className='font-light' style={{ color: '#4D4D4D', fontSize: 14 }}>Secure Backup &amp; Restore Platform</p>
              </div>
            </div>

            {/* Login Card */}
            <div
              className='w-full rounded-2xl bg-white px-8 py-10 sm:px-10'
              style={{ boxShadow: '0px 0px 49px 0px rgba(6,6,6,0.10)' }}
            >
            <h2 className='mb-2 font-semibold' style={{ color: '#33363F', fontSize: 28 }}>Welcome Back</h2>
            <p className='mb-8 text-sm' style={{ color: '#33363F' }}>
              Login to your DataCraft account with Salesforce Credentials
            </p>

            {loginError && (
              <div className={`mb-5 rounded-xl border px-4 py-3 ${errorType === 'access_denied' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                <div className='flex items-start gap-3'>
                  {errorType === 'access_denied' ? (
                    <svg className='mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 15v2m0-10v5m-7 7h14a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.27 17A2 2 0 005 20z' />
                    </svg>
                  ) : (
                    <svg className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-500' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <circle cx='12' cy='12' r='10' /><path d='M12 8v4M12 16h.01' strokeLinecap='round' />
                    </svg>
                  )}
                  <div className='flex-1'>
                    <p className={`text-sm font-semibold ${errorType === 'access_denied' ? 'text-amber-800' : 'text-red-700'}`}>
                      {errorType === 'access_denied' ? 'App Not Approved' : loginError?.toLowerCase().includes('permission') ? 'Access Denied' : 'Login Failed'}
                    </p>
                    <p className={`text-xs mt-0.5 ${errorType === 'access_denied' ? 'text-amber-700' : 'text-red-600'}`}>{loginError}</p>
                    {errorType === 'access_denied' && (
                      <p className='text-xs text-amber-600 mt-1.5 leading-relaxed'>
                        To fix this, ask your Salesforce admin to go to <span className='font-semibold'>Setup → Connected Apps</span> and approve this application for your profile or permission set.
                      </p>
                    )}
                  </div>
                  <button onClick={() => { setLoginError(null); setErrorType(null); }} className={`${errorType === 'access_denied' ? 'text-amber-400 hover:text-amber-600' : 'text-red-400 hover:text-red-600'} transition-colors`}>
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <p className='mb-5 font-semibold' style={{ color: '#33363F', fontSize: 16 }}>Sign In With</p>

            {/* Salesforce Production */}
            <button
              onClick={() => handleSalesforceLogin('production')}
              disabled={socialLoginMutation.isPending}
              className='mb-4 w-full transition disabled:cursor-not-allowed disabled:opacity-50'
              style={{
                height: 52,
                background: '#155DFC',
                borderRadius: 12,
                color: '#fff',
                fontSize: 15,
                fontWeight: 400,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.10)',
              }}
            >
              {socialLoginMutation.isPending ? 'Connecting...' : 'Salesforce Production'}
            </button>

            {/* Salesforce Sandbox */}
            <button
              onClick={() => handleSalesforceLogin('sandbox')}
              disabled={socialLoginMutation.isPending}
              className='mb-6 w-full transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50'
              style={{
                height: 52,
                background: '#fff',
                borderRadius: 12,
                color: '#155DFC',
                fontSize: 15,
                fontWeight: 400,
                border: '1.5px solid #155DFC',
                cursor: 'pointer',
                boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.10)',
              }}
            >
              {socialLoginMutation.isPending ? 'Connecting...' : 'Salesforce Sandbox'}
            </button>

            {/* Login with custom URL */}
            <div className='mb-5 text-center'>
              <button
                type='button'
                onClick={() => setIsCustomURLModalOpen(true)}
                disabled={socialLoginMutation.isPending}
                className='text-sm font-normal transition hover:underline disabled:cursor-not-allowed disabled:opacity-50'
                style={{ color: '#155DFC', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Login with custom URL
              </button>
            </div>

            {/* Learn more */}
            <p className='text-center text-xs' style={{ color: '#33363F' }}>
              Learn more about the product -{' '}
              <a href='#' className='hover:underline' style={{ color: '#155DFC', fontWeight: 600 }}>
                Checkout the document ?
              </a>
            </p>
            </div>{/* end login card */}
          </div>{/* end max-w-xl wrapper */}
        </div>{/* end flex-1 center */}

        {/* Footer */}
        <div className='text-center text-xs' style={{ color: '#64748B' }}>
          <p>Privacy Policy | Terms &amp; Conditions | Support</p>
          <p className='mt-1'>@ 2026 360 DataCraft</p>
        </div>
      </div>

      {/* ── Right side ── */}
      <div className='hidden lg:flex flex-1 flex-col items-center justify-between py-10 px-8'>

        {/* Illustration */}
        <div className='flex flex-1 items-center justify-center w-full'>
          <img
            src={LoginPagePicture}
            alt='DataCraft Illustration'
            className='max-h-[55vh] w-auto max-w-full object-contain'
          />
        </div>

        {/* Trust badges */}
        <div className='flex flex-wrap items-center justify-center gap-6 xl:gap-10 mb-4'>
          <span className='flex items-center gap-1.5 text-sm font-light' style={{ color: 'rgba(10,10,10,0.5)' }}>
            <LockIcon className='h-5 w-5' style={{ opacity: 0.5 }} /> 256-Bit Encryption
          </span>
          <span className='flex items-center gap-1.5 text-sm font-light' style={{ color: 'rgba(10,10,10,0.5)' }}>
            <ShieldIcon className='h-5 w-5' style={{ opacity: 0.5 }} /> SOC 2 Compliant
          </span>
          <span className='flex items-center gap-1.5 text-sm font-light' style={{ color: 'rgba(10,10,10,0.5)' }}>
            <CheckCircleIcon className='h-5 w-5' style={{ opacity: 0.5 }} /> GDPR Ready
          </span>
        </div>

        {/* Right footer */}
        <div className='text-center text-xs' style={{ color: 'rgba(10,10,10,0.4)' }}>
          <p>Privacy Policy | Terms &amp; Conditions | Support</p>
          <p className='mt-1'>© 2026 360 DataCraft</p>
        </div>
      </div>

      <RecoverPasswordModal isOpen={isRecoverModalOpen} onClose={() => setIsRecoverModalOpen(false)} />
      <CustomURLModal isOpen={isCustomURLModalOpen} onClose={() => setIsCustomURLModalOpen(false)} />
    </div>
  );
}
