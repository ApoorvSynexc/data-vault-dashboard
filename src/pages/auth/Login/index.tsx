import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import FormError from '../../../components/FormError';
import TextField from '../../../components/TextField';
import MailIcon from '../../../assets/icons/mail.svg?react';
import EyeIcon from '../../../assets/icons/eye.svg?react';
import EyeOffIcon from '../../../assets/icons/eye-off.svg?react';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';
import GoogleIcon from '../../../assets/icons/google.svg?react';
import MicrosoftIcon from '../../../assets/icons/microsoft.svg?react';
import SSOIcon from '../../../assets/icons/sso.svg?react';
import type { LoginForm } from '../auth.types';
import { useAuthService } from '../../../services';
import { validateLoginForm } from '../../../validation';

type LoginFormState = {
  fieldErrors: Partial<Record<keyof LoginForm, string>>;
  submitError: string;
  values: LoginForm;
  success: boolean;
};

const initialState: LoginFormState = {
  fieldErrors: {},
  submitError: '',
  values: { email: '', password: '' },
  success: false,
};

export default function Login() {
  const { refreshProfile } = useAuth();
  const { login } = useAuthService();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleLoginSubmit(
    _previousState: LoginFormState,
    formData: FormData,
  ): Promise<LoginFormState> {
    const values: LoginForm = {
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? '').trim(),
    };

    const fieldErrors = await validateLoginForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors, submitError: '', values, success: false };
    }

    try {
      await login(values);
      await refreshProfile();
      return { fieldErrors: {}, submitError: '', values, success: true };
    } catch (error) {
      return {
        fieldErrors: {},
        submitError: error instanceof Error ? error.message : 'Unable to sign in',
        values,
        success: false,
      };
    }
  }

  const [state, submitAction] = useActionState(handleLoginSubmit, initialState);
  return (
    <div className='flex flex-1 bg-[#EEF2FF]'>
      {/* ── Left Panel ── */}
      <div className='flex flex-col flex-1 items-center justify-center px-8 py-12'>
        {/* Logo */}
        <div className='flex items-center gap-3 mb-8 self-start ml-2'>
          <div className='w-10 h-10 bg-blue-600 rounded-lg rotate-45 flex items-center justify-center'>
            <span className='-rotate-45 text-white text-xs font-bold'>DV</span>
          </div>
          <div>
            <p className='text-xl font-bold text-gray-900 leading-tight'>360 DataCraft</p>
            <p className='text-xs text-gray-500'>Secure Backup &amp; Restore Platform</p>
          </div>
        </div>

        {/* Form Card */}
        <div className='bg-white rounded-2xl shadow-md w-full max-w-md p-8'>

          <h2 className='text-2xl font-bold text-gray-900 mb-1'>Welcome Back</h2>
          <p className='text-sm text-gray-500 mb-6'>Enter your credentials to access your account</p>

          <form action={submitAction} className='flex flex-col gap-4'>
            <TextField
              label='Email'
              name='email'
              type='email'
              placeholder='Enter you email'
              defaultValue={state.values.email}
              error={state.fieldErrors.email}
              rightIcon={<MailIcon className='h-4 w-4' />}
            />

            <TextField
              name='password'
              label='Password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter password'
              defaultValue={state.values.password}
              error={state.fieldErrors.password}
              rightIcon={showPassword
                ? <EyeOffIcon className='h-4 w-4' />
                : <EyeIcon className='h-4 w-4' />
              }
              onRightIconClick={() => setShowPassword((v) => !v)}
            />

            {/* Remember me + Forgot */}
            <div className='flex items-center justify-between'>
              <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  name='rememberMe'
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300 accent-blue-600'
                />
                Remember Me
              </label>
              <Link to='/forgot-password' className='text-sm text-blue-600 hover:underline'>
                Forgot Password?
              </Link>
            </div>

            <FormError message={state.submitError} />
            <SubmitButton />

            {/* Divider */}
            <div className='flex items-center gap-3 my-1'>
              <hr className='flex-1 border-gray-200' />
              <span className='text-xs text-gray-400'>Or sign in with</span>
              <hr className='flex-1 border-gray-200' />
            </div>

            {/* Social buttons */}
            <div className='grid grid-cols-3 gap-3'>
              <SocialButton icon={<GoogleIcon className='h-4 w-4' />} label='Google' />
              <SocialButton icon={<MicrosoftIcon className='h-4 w-4' />} label='Microsoft' />
              <SocialButton icon={<SSOIcon className='h-4 w-4' />} label='SSO' />
            </div>

            <p className='text-sm text-center text-gray-500 mt-1'>
              Don't have an account?{' '}
              <Link to='/signup' className='text-blue-600 font-semibold hover:underline'>
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className='hidden lg:flex flex-col flex-1 items-center justify-between bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 px-12 py-8'>
        {/* Illustration placeholder */}
        <div className='flex-1 flex items-center justify-center w-full'>
          <IllustrationPlaceholder />
        </div>

        {/* Trust badges */}
        <div className='flex items-center gap-6 mb-6'>
          <TrustBadge icon={<LockIcon className='h-4 w-4' />} label='256-Bit Encryption' />
          <TrustBadge icon={<ShieldIcon className='h-4 w-4' />} label='SOC 2 Compliant' />
          <TrustBadge icon={<CheckCircleIcon className='h-4 w-4' />} label='GDPR Ready' />
        </div>

        {/* Footer */}
        <div className='text-center text-white/60 text-xs flex flex-col gap-1'>
          <p>
            <a href='#' className='hover:text-white'>Privacy Policy</a>
            {' | '}
            <a href='#' className='hover:text-white'>Terms &amp; Conditions</a>
            {' | '}
            <a href='#' className='hover:text-white'>Support</a>
          </p>
          <p>© 2026 360 DataCraft</p>
        </div>
      </div>
    </div>
  );
}

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className='flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 transition'>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending
          ? 'cursor-not-allowed bg-blue-300 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && (
        <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
      )}
      {pending ? 'Signing In...' : 'Sign In'}
    </button>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className='flex items-center gap-1.5 text-white/80 text-sm'>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function IllustrationPlaceholder() {
  return (
    <div className='w-full max-w-sm aspect-square rounded-3xl bg-white/10 flex items-center justify-center'>
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
