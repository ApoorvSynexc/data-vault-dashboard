import { Link } from 'react-router-dom';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import MailIcon from '../../../assets/icons/mail.svg?react';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';

export default function ForgotPassword() {
  return (
    <div className='flex flex-1 bg-[#EEF2FF]'>
      <div className='flex flex-1 flex-col items-center justify-center px-8 py-6'>
        <div className='mb-8 ml-2 flex items-center gap-3 self-start'>
          <div className='flex h-10 w-10 rotate-45 items-center justify-center rounded-lg bg-blue-600'>
            <span className='-rotate-45 text-xs font-bold text-white'>DV</span>
          </div>
          <div>
            <p className='text-xl font-bold leading-tight text-gray-900'>360 DataVault</p>
            <p className='text-xs text-gray-500'>Secure Backup &amp; Restore Platform</p>
          </div>
        </div>

        <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-md'>
          <h2 className='mb-1 text-2xl font-bold text-gray-900'>Forgot Password?</h2>
          <p className='mb-6 text-sm text-gray-500'>
            Enter your email and we&apos;ll send you a password reset link.
          </p>

          <div className='flex flex-col gap-4'>
            <TextField
              label='Email'
              type='email'
              placeholder='Enter you email'
              rightIcon={<MailIcon className='h-4 w-4' />}
            />

            <Button fullWidth size='lg'>Send Reset Link</Button>

            <p className='mt-1 text-center text-sm text-gray-500'>
              Remember your password?{' '}
              <Link to='/login' className='font-semibold text-blue-600 hover:underline'>
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className='hidden flex-1 flex-col items-center justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 px-12 py-8 lg:flex'>
        <div className='flex w-full flex-1 items-center justify-center'>
          <IllustrationPlaceholder />
        </div>

        <div className='mb-6 flex items-center gap-6'>
          <TrustBadge icon={<LockIcon className='h-4 w-4' />} label='256-Bit Encryption' />
          <TrustBadge icon={<ShieldIcon className='h-4 w-4' />} label='SOC 2 Compliant' />
          <TrustBadge icon={<CheckCircleIcon className='h-4 w-4' />} label='GDPR Ready' />
        </div>

        <div className='flex flex-col gap-1 text-center text-xs text-white/60'>
          <p>
            <a href='#' className='hover:text-white'>Privacy Policy</a>
            {' | '}
            <a href='#' className='hover:text-white'>Terms &amp; Conditions</a>
            {' | '}
            <a href='#' className='hover:text-white'>Support</a>
          </p>
          <p>© 2026 360 DataVault</p>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className='flex items-center gap-1.5 text-sm text-white/80'>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function IllustrationPlaceholder() {
  return (
    <div className='flex aspect-square w-full max-w-sm items-center justify-center rounded-3xl bg-white/10'>
      <svg viewBox='0 0 200 200' className='w-4/5 opacity-80' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <ellipse cx='100' cy='60' rx='45' ry='28' fill='white' fillOpacity='0.9' />
        <ellipse cx='76' cy='70' rx='28' ry='20' fill='white' fillOpacity='0.9' />
        <ellipse cx='126' cy='68' rx='24' ry='18' fill='white' fillOpacity='0.9' />
        <path d='M100 58 L100 34 M92 42 L100 34 L108 42' stroke='#3B82F6' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M100 110 C100 110 75 120 75 145 C75 160 86 170 100 175 C114 170 125 160 125 145 C125 120 100 110 100 110Z' fill='white' fillOpacity='0.9' />
        <path d='M91 145 L97 151 L111 137' stroke='#3B82F6' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        <rect x='40' y='120' width='30' height='8' rx='2' fill='white' fillOpacity='0.7' />
        <rect x='40' y='132' width='30' height='8' rx='2' fill='white' fillOpacity='0.7' />
        <circle cx='66' cy='124' r='2' fill='#22C55E' />
        <circle cx='66' cy='136' r='2' fill='#22C55E' />
        <rect x='128' y='140' width='34' height='22' rx='3' fill='white' fillOpacity='0.7' />
        <rect x='124' y='162' width='42' height='4' rx='2' fill='white' fillOpacity='0.5' />
        <circle cx='60' cy='108' r='4' fill='#22C55E' fillOpacity='0.8' />
        <circle cx='142' cy='115' r='4' fill='#22C55E' fillOpacity='0.8' />
        <circle cx='80' cy='165' r='3' fill='#22C55E' fillOpacity='0.6' />
      </svg>
    </div>
  );
}
