import { useState } from 'react';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';
import RecoverPasswordModal from '../RecoverPasswordModal';

export default function LoginV2() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);

  const handleSalesforceLogin = async (env: 'production' | 'sandbox') => {
    try {
      setIsLoading(true);
      const authUrl = `/api/auth/salesforce${env === 'sandbox' ? '-sandbox' : ''}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className='flex h-screen w-full'>
      {/* ── Left Panel ── */}
      <div className='flex w-1/2 flex-col items-center justify-between bg-gradient-to-b from-[#f0f4ff] to-[#e8ecff] px-12 py-8'>
        {/* Logo */}
        <div className='flex w-full items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-600'>
            <span className='text-xs font-bold text-white'>DV</span>
          </div>
          <div>
            <p className='text-lg font-bold text-gray-900'>360 DataVault</p>
            <p className='text-xs text-gray-500'>Secure Backup &amp; Restore Platform</p>
          </div>
        </div>

        {/* Center Content */}
        <div className='flex w-full max-w-sm flex-col items-center justify-center gap-6'>
          {/* Card */}
          <div className='w-full rounded-2xl bg-white p-8 shadow-md'>
            <h2 className='mb-2 text-2xl font-bold text-gray-900'>Welcome Back</h2>
            <p className='mb-6 text-sm text-gray-600'>
              Login to your DataVault account with Salesforce Credentials
            </p>

            {/* Sign In With */}
            <div className='mb-6'>
              <p className='mb-4 text-sm font-semibold text-gray-900'>Sign In With</p>

              {/* Salesforce Production Button */}
              <button
                onClick={() => handleSalesforceLogin('production')}
                disabled={isLoading}
                className='mb-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isLoading ? 'Connecting...' : 'Salesforce Production'}
              </button>

              {/* Salesforce Sandbox Button */}
              <button
                onClick={() => handleSalesforceLogin('sandbox')}
                disabled={isLoading}
                className='w-full rounded-lg border-2 border-blue-600 px-4 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isLoading ? 'Connecting...' : 'Salesforce Sandbox'}
              </button>
            </div>

            {/* Links */}
            <div className='space-y-3 text-center'>
              <p>
                <button
                  type='button'
                  onClick={() => setIsRecoverModalOpen(true)}
                  className='cursor-pointer text-sm text-blue-600 hover:underline'
                >
                  Forgot your credentials ?
                </button>
              </p>
              <p className='text-xs text-gray-600'>
                Learn more about the product -{' '}
                <a href='#' className='cursor-pointer text-blue-600 hover:underline'>
                  Checkout the document ?
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex flex-col gap-2 text-center text-xs text-gray-600'>
          <p>
            <a href='#' className='hover:text-gray-900'>
              Privacy Policy
            </a>
            {' | '}
            <a href='#' className='hover:text-gray-900'>
              Terms &amp; Conditions
            </a>
            {' | '}
            <a href='#' className='hover:text-gray-900'>
              Support
            </a>
          </p>
          <p>© 2026 360 DataVault</p>
        </div>
      </div>

      <RecoverPasswordModal
        isOpen={isRecoverModalOpen}
        onClose={() => setIsRecoverModalOpen(false)}
      />

      {/* ── Right Panel ── */}
      <div className='flex w-1/2 flex-col items-center justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-12 py-8'>
        {/* Illustration */}
        <div className='flex w-full flex-1 items-center justify-center'>
          <DataSecurityIllustration />
        </div>

        {/* Trust badges */}
        <div className='mb-8 flex flex-wrap items-center justify-center gap-6'>
          <TrustBadge icon={<LockIcon className='h-5 w-5' />} label='256-Bit Encryption' />
          <TrustBadge icon={<ShieldIcon className='h-5 w-5' />} label='SOC 2 Compliant' />
          <TrustBadge icon={<CheckCircleIcon className='h-5 w-5' />} label='GDPR Ready' />
        </div>

        {/* Footer */}
        <div className='flex flex-col gap-1 text-center text-xs text-white/70'>
          <p>
            <a href='#' className='hover:text-white'>
              Privacy Policy
            </a>
            {' | '}
            <a href='#' className='hover:text-white'>
              Terms &amp; Conditions
            </a>
            {' | '}
            <a href='#' className='hover:text-white'>
              Support
            </a>
          </p>
          <p>© 2026 360 DataVault</p>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className='flex items-center gap-1.5 text-white/90 text-sm'>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DataSecurityIllustration() {
  return (
    <div className='w-full max-w-sm'>
      <svg viewBox='0 0 400 400' className='h-64 w-64' fill='none' xmlns='http://www.w3.org/2000/svg'>
        {/* Background cloud shapes */}
        <circle cx='150' cy='150' r='80' fill='white' opacity='0.1' />
        <circle cx='280' cy='180' r='100' fill='white' opacity='0.08' />

        {/* Lock icon - large central element */}
        <g>
          {/* Lock body */}
          <rect x='140' y='150' width='120' height='100' rx='8' fill='none' stroke='white' strokeWidth='3' opacity='0.9' />
          {/* Lock shackle */}
          <path
            d='M160 150 Q160 100 200 100 Q240 100 240 150'
            fill='none'
            stroke='white'
            strokeWidth='3'
            opacity='0.9'
          />
          {/* Keyhole */}
          <circle cx='200' cy='190' r='6' fill='white' opacity='0.9' />
        </g>

        {/* Data/folder icon - left side */}
        <g>
          <rect x='80' y='240' width='70' height='60' rx='4' fill='none' stroke='white' strokeWidth='2.5' opacity='0.8' />
          <line x1='90' y1='255' x2='140' y2='255' stroke='white' strokeWidth='2' opacity='0.7' />
          <line x1='90' y1='270' x2='140' y2='270' stroke='white' strokeWidth='2' opacity='0.7' />
          {/* Green indicator */}
          <circle cx='155' cy='245' r='8' fill='#22C55E' opacity='0.9' />
        </g>

        {/* Shield icon - right side */}
        <g>
          <path
            d='M250 230 L280 210 L280 260 Q280 290 250 310 Q220 290 220 260 L220 210 Z'
            fill='none'
            stroke='white'
            strokeWidth='2.5'
            opacity='0.8'
          />
          {/* Checkmark in shield */}
          <path d='M240 265 L250 275 L270 250' stroke='#22C55E' strokeWidth='2.5' opacity='0.9' strokeLinecap='round' strokeLinejoin='round' />
        </g>

        {/* Top right checkmark badge */}
        <circle cx='320' cy='100' r='20' fill='#22C55E' opacity='0.95' />
        <path d='M310 100 L315 108 L330 92' stroke='white' strokeWidth='3' opacity='1' strokeLinecap='round' strokeLinejoin='round' />

        {/* Connecting lines */}
        <line x1='200' y1='250' x2='200' y2='320' stroke='white' strokeWidth='1.5' opacity='0.3' strokeDasharray='5,5' />
      </svg>
    </div>
  );
}
