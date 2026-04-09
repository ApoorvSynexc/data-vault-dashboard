import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import FormError from '../../../components/FormError';
import TextField from '../../../components/TextField';
import MailIcon from '../../../assets/icons/mail.svg?react';
import EyeIcon from '../../../assets/icons/eye.svg?react';
import EyeOffIcon from '../../../assets/icons/eye-off.svg?react';
import LockIcon from '../../../assets/icons/lock.svg?react';
import ShieldIcon from '../../../assets/icons/shield.svg?react';
import CheckCircleIcon from '../../../assets/icons/check-circle.svg?react';
import type { SignupForm } from '../auth.types';
import { useAuthService } from '../../../services';
import { validateSignupForm } from '../../../validation';

// ─── Signup form state ───────────────────────────────────────────────────────

type SignupFormState = {
  fieldErrors: Partial<Record<keyof SignupForm, string>>;
  submitError: string;
  values: SignupForm;
};

const signupInitial: SignupFormState = {
  fieldErrors: {},
  submitError: '',
  values: { firstName: '', lastName: '', email: '', gender: '', password: '', confirmPassword: '' },
};

// ─── OTP form state ──────────────────────────────────────────────────────────

type OtpFormState = { submitError: string };
const otpInitial: OtpFormState = { submitError: '' };

const RESEND_SECONDS = 60;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Signup() {
  const { signup, verifyOtp, sendOtp } = useAuthService();
  const navigate = useNavigate();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [signedUpEmail, setSignedUpEmail] = useState('');
  const pendingValuesRef = useRef<SignupForm | null>(null);

  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // ── Countdown timer ──
  const [countdown, setCountdown] = useState(0);
  const [resendError, setResendError] = useState('');
  const [resendPending, setResendPending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // ── Step 1: Validate + send OTP ──
  async function handleSignupSubmit(
    _prev: SignupFormState,
    formData: FormData,
  ): Promise<SignupFormState> {
    const values: SignupForm = {
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      gender: String(formData.get('gender') ?? '').trim(),
      password: String(formData.get('password') ?? '').trim(),
      confirmPassword: String(formData.get('confirmPassword') ?? '').trim(),
    };

    if (!agreeToTerms) {
      return { fieldErrors: {}, submitError: 'You must agree to the Terms & Conditions', values };
    }

    const fieldErrors = await validateSignupForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors, submitError: '', values };
    }

    try {
      await sendOtp({ channel: 'EMAIL', contact: values.email, otpType: 'SIGNUP' });
      pendingValuesRef.current = values;
      setSignedUpEmail(values.email);
      setCountdown(RESEND_SECONDS);
      setStep('otp');
      return { fieldErrors: {}, submitError: '', values };
    } catch (error) {
      return {
        fieldErrors: {},
        submitError: error instanceof Error ? error.message : 'Unable to send verification code',
        values,
      };
    }
  }

  // ── Step 2: Verify OTP then auto-create account ──
  async function handleOtpSubmit(
    _prev: OtpFormState,
    formData: FormData,
  ): Promise<OtpFormState> {
    const otp = Array.from({ length: 6 }, (_, i) =>
      String(formData.get(`otp-${i}`) ?? ''),
    ).join('');

    if (otp.length < 6) {
      return { submitError: 'Please enter the complete 6-digit code' };
    }

    try {
      await verifyOtp({ channel: 'EMAIL', contact: signedUpEmail, otp, otpType: 'SIGNUP' });
    } catch (error) {
      return { submitError: error instanceof Error ? error.message : 'Invalid or expired OTP' };
    }

    try {
      await signup(pendingValuesRef.current!);
      navigate('/login');
      return { submitError: '' };
    } catch (error) {
      return { submitError: error instanceof Error ? error.message : 'Unable to create account. Please try again.' };
    }
  }

  async function handleResend() {
    setResendError('');
    setResendPending(true);
    try {
      await sendOtp({ channel: 'EMAIL', contact: signedUpEmail, otpType: 'SIGNUP' });
      setCountdown(RESEND_SECONDS);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend OTP');
    } finally {
      setResendPending(false);
    }
  }

  const [signupState, signupAction, signupPending] = useActionState(handleSignupSubmit, signupInitial);
  const [otpState, otpAction] = useActionState(handleOtpSubmit, otpInitial);

  return (
    <div className='flex flex-1 bg-[#EEF2FF]'>
      {/* ── Left Panel ── */}
      <div className='flex flex-col flex-1 items-center justify-center px-8 py-6'>
        {/* Logo */}
        <div className='mb-8 ml-2 flex items-center gap-3 self-start'>
          <div className='flex h-10 w-10 rotate-45 items-center justify-center rounded-lg bg-blue-600'>
            <span className='-rotate-45 text-xs font-bold text-white'>DV</span>
          </div>
          <div>
            <p className='leading-tight text-xl font-bold text-gray-900'>360 DataVault</p>
            <p className='text-xs text-gray-500'>Secure Backup &amp; Restore Platform</p>
          </div>
        </div>

        {step === 'form' ? (
          <SignupFormCard
            state={signupState}
            action={signupAction}
            pending={signupPending}
            gender={gender}
            onGenderChange={setGender}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            agreeToTerms={agreeToTerms}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onToggleConfirmPassword={() => setShowConfirmPassword((v) => !v)}
            onToggleTerms={(v) => setAgreeToTerms(v)}
          />
        ) : (
          <OtpCard
            email={signedUpEmail}
            state={otpState}
            action={otpAction}
            countdown={countdown}
            resendError={resendError}
            resendPending={resendPending}
            onResend={handleResend}
            onBack={() => setStep('form')}
          />
        )}
      </div>

      {/* ── Right Panel ── */}
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

// ─── Step 1 card ─────────────────────────────────────────────────────────────

function SignupFormCard({
  state,
  action,
  pending,
  gender,
  onGenderChange,
  showPassword,
  showConfirmPassword,
  agreeToTerms,
  onTogglePassword,
  onToggleConfirmPassword,
  onToggleTerms,
}: {
  state: SignupFormState;
  action: (payload: FormData) => void;
  pending: boolean;
  gender: string;
  onGenderChange: (v: string) => void;
  showPassword: boolean;
  showConfirmPassword: boolean;
  agreeToTerms: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onToggleTerms: (v: boolean) => void;
}) {
  return (
    <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-md'>
      <h2 className='mb-1 text-2xl font-bold text-gray-900'>Create Your Account</h2>
      <p className='mb-6 text-sm text-gray-500'>
        Get started with secure backup &amp; restore in minutes
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); action(new FormData(e.currentTarget)); }}
        className='flex flex-col gap-4'
      >
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='First Name'
            name='firstName'
            type='text'
            placeholder='First name'
            defaultValue={state.values.firstName}
            error={state.fieldErrors.firstName}
            rightIcon={<UserIcon className='h-4 w-4' />}
          />
          <TextField
            label='Last Name'
            name='lastName'
            type='text'
            placeholder='Last name'
            defaultValue={state.values.lastName}
            error={state.fieldErrors.lastName}
            rightIcon={<UserIcon className='h-4 w-4' />}
          />
        </div>

        <TextField
          label='Email'
          name='email'
          type='email'
          placeholder='Enter your email'
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
          rightIcon={<MailIcon className='h-4 w-4' />}
        />

        <div className='flex flex-col gap-1'>
          <label className='text-sm font-medium text-gray-700'>Gender</label>
          <select
            name='gender'
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            className={[
              'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              state.fieldErrors.gender ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
          >
            <option value=''>Select gender</option>
            <option value='MALE'>Male</option>
            <option value='FEMALE'>Female</option>
            <option value='OTHER'>Other</option>
          </select>
          {state.fieldErrors.gender && (
            <p className='text-xs text-red-500'>{state.fieldErrors.gender}</p>
          )}
        </div>

        <TextField
          label='Password'
          name='password'
          type={showPassword ? 'text' : 'password'}
          placeholder='Enter password'
          defaultValue={state.values.password}
          error={state.fieldErrors.password}
          rightIcon={showPassword ? <EyeOffIcon className='h-4 w-4' /> : <EyeIcon className='h-4 w-4' />}
          onRightIconClick={onTogglePassword}
        />

        <TextField
          label='Confirm Password'
          name='confirmPassword'
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder='Re-enter password'
          defaultValue={state.values.confirmPassword}
          error={state.fieldErrors.confirmPassword}
          rightIcon={showConfirmPassword ? <EyeOffIcon className='h-4 w-4' /> : <EyeIcon className='h-4 w-4' />}
          onRightIconClick={onToggleConfirmPassword}
        />

        <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-600 select-none'>
          <input
            type='checkbox'
            checked={agreeToTerms}
            onChange={(e) => onToggleTerms(e.target.checked)}
            className='h-4 w-4 rounded border-gray-300 accent-blue-600'
          />
          <span>
            I agree to the{' '}
            <a href='#' className='text-blue-600 hover:underline'>Terms &amp; Conditions</a>
            {' '}and{' '}
            <a href='#' className='text-blue-600 hover:underline'>Privacy Policy</a>
          </span>
        </label>

        <FormError message={state.submitError} />
        <SignupSubmitButton pending={pending} />

        <p className='mt-1 text-center text-sm text-gray-500'>
          Already have an account?{' '}
          <Link to='/login' className='font-semibold text-blue-600 hover:underline'>
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}

// ─── Step 2 card ─────────────────────────────────────────────────────────────

function OtpCard({
  email,
  state,
  action,
  countdown,
  resendError,
  resendPending,
  onResend,
  onBack,
}: {
  email: string;
  state: OtpFormState;
  action: (payload: FormData) => void;
  countdown: number;
  resendError: string;
  resendPending: boolean;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-md'>
      {/* Back */}
      <button
        type='button'
        onClick={onBack}
        className='mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition'
      >
        <ArrowLeftIcon className='h-4 w-4' />
        Back to Sign Up
      </button>

      {/* Icon */}
      <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50'>
        <MailIcon className='h-7 w-7 text-blue-600' />
      </div>

      <h2 className='mb-1 text-2xl font-bold text-gray-900'>Verify Your Email</h2>
      <p className='mb-2 text-sm text-gray-500'>
        We've sent a 6-digit code to
      </p>
      <p className='mb-6 text-sm font-semibold text-gray-800'>{email}</p>

      <form action={action} className='flex flex-col gap-5'>
        <OtpInputs error={state.submitError} />

        <FormError message={state.submitError} />
        <OtpSubmitButton />

        {/* Resend */}
        <div className='text-center text-sm text-gray-500'>
          {countdown > 0 ? (
            <span>
              Resend code in{' '}
              <span className='font-semibold text-blue-600 tabular-nums'>
                0:{String(countdown).padStart(2, '0')}
              </span>
            </span>
          ) : (
            <button
              type='button'
              onClick={onResend}
              disabled={resendPending}
              className='font-semibold text-blue-600 hover:underline disabled:opacity-50'
            >
              {resendPending ? 'Sending...' : "Didn't receive it? Resend"}
            </button>
          )}
        </div>
        {resendError && <p className='text-center text-xs text-red-500'>{resendError}</p>}
      </form>
    </div>
  );
}

// ─── OTP 6-box input ─────────────────────────────────────────────────────────

function OtpInputs({ error }: { error?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    e.target.value = digit;
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((char, i) => {
      if (refs.current[i]) refs.current[i]!.value = char;
    });
    const focusIndex = Math.min(digits.length, 5);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className='flex flex-col gap-2'>
      <label className='text-sm font-medium text-gray-700'>Enter OTP</label>
      <div className='flex justify-between gap-2'>
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            name={`otp-${i}`}
            type='text'
            inputMode='numeric'
            maxLength={1}
            autoFocus={i === 0}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={[
              'h-12 w-full rounded-lg border text-center text-lg font-semibold text-gray-900 outline-none transition',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Submit buttons ───────────────────────────────────────────────────────────

function SignupSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending ? 'cursor-not-allowed bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && <Spinner />}
      {pending ? 'Sending Code...' : 'Create Account'}
    </button>
  );
}

function OtpSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending ? 'cursor-not-allowed bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && <Spinner />}
      {pending ? 'Creating Account...' : 'Verify & Create Account'}
    </button>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function Spinner() {
  return <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />;
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className={className}>
      <path d='M20 21C20 17.6863 16.4183 15 12 15C7.58172 15 4 17.6863 4 21' strokeLinecap='round' />
      <circle cx='12' cy='8' r='4' />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className}>
      <path d='M19 12H5M5 12L12 19M5 12L12 5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}
