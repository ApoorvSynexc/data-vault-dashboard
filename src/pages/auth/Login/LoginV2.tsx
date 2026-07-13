import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import LoginPagePicture from '../../../assets/icons/LoginPagePicture.svg';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';
import RecoverPasswordModal from '../RecoverPasswordModal';
import CustomURLModal from '../CustomURLModal';
import { useAuthService } from '../../../services/auth/auth.service';

export default function LoginV2() {
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [isCustomURLModalOpen, setIsCustomURLModalOpen] = useState(false);
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
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const socialLoginMutation = useMutation({
    mutationFn: ({ environment }: { environment?: string }) =>
      authService.initiateSocialLogin('salesforce', undefined, environment),
  });

  const handleSalesforceLogin = (env: 'production' | 'sandbox') => {
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
              <svg width="72" height="72" viewBox="3 2 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="23.1601" height="23.2585" rx="7" transform="matrix(0.66168 0.708274 -0.66168 0.708274 20.5117 1.75586)" fill="#155DFC"/>
                <path d="M34.5285 19.9376C34.9771 19.4574 35.6229 19.2542 36.2429 19.3983C37.6854 19.7333 38.21 21.644 37.1663 22.7612L28.7282 31.7935C28.2675 32.2866 27.5999 32.4867 26.967 32.3214C25.554 31.9522 25.0619 30.0708 26.0904 28.9699L34.5285 19.9376Z" fill="#D9D9D9" fillOpacity="0.7"/>
                <rect width="23.1601" height="23.2585" rx="7" transform="matrix(0.66168 0.708274 -0.66168 0.708274 25.5469 2.28613)" fill="#155DFC" fillOpacity="0.4"/>
              </svg>
              <div>
                <p className='font-bold leading-tight' style={{ color: '#33363F', fontSize: 30 }}>360 DataVault</p>
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
              Login to your DataVault account with Salesforce Credentials
            </p>

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
          <p>Privacy Ploicy | Terms &amp; Conditions | Support</p>
          <p className='mt-1'>@ 2026 360 DataVault</p>
        </div>
      </div>

      {/* ── Right side ── */}
      <div className='hidden lg:flex flex-1 flex-col items-center justify-between py-10 px-8'>

        {/* Illustration */}
        <div className='flex flex-1 items-center justify-center w-full'>
          <img
            src={LoginPagePicture}
            alt='DataVault Illustration'
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
          <p className='mt-1'>© 2026 360 DataVault</p>
        </div>
      </div>

      <RecoverPasswordModal isOpen={isRecoverModalOpen} onClose={() => setIsRecoverModalOpen(false)} />
      <CustomURLModal isOpen={isCustomURLModalOpen} onClose={() => setIsCustomURLModalOpen(false)} />
    </div>
  );
}
