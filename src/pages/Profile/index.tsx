import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useUserService, useAuthService } from '../../services';
import FormError from '../../components/FormError';
import TextField from '../../components/TextField';
import type { UserProfile } from '../../types';
import {
  validateUpdateProfile,
  validateEmail,
  type UpdateProfileValues,
} from '../../validation';

const RESEND_SECONDS = 60;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { refreshProfile, logout } = useAuth();
  const { getMyProfile } = useUserService();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const data = await getMyProfile<UserProfile>();
      if (!data) throw new Error('Failed to load profile');
      return data;
    },
  });

  async function handleProfileSaved() {
    await queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    await refreshProfile();
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <Spinner className='h-8 w-8 text-blue-600' />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className='flex items-center justify-center py-24 text-sm text-red-500'>
        Failed to load profile. Please refresh the page.
      </div>
    );
  }

  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const email = profile.contact?.email ?? '—';

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-6'>

      {/* ── Header card ── */}
      <div className='flex items-center gap-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
        <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white'>
          {initials}
        </div>
        <div className='min-w-0 flex-1'>
          <h1 className='text-xl font-bold text-gray-900'>{fullName}</h1>
          <p className='mt-0.5 text-sm text-gray-500'>{email}</p>
        </div>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'>
          <span className='h-1.5 w-1.5 rounded-full bg-green-500' />
          Active
        </span>
      </div>

      {/* ── Content ── */}
      <PersonalInfoCard key={profile.id} profile={profile} onSaved={handleProfileSaved} />
      <EmailCard key={`email-${profile.id}`} profile={profile} onSaved={handleProfileSaved} />
      <DeleteAccountCard onDeleted={async () => { try { await logout(); } catch { /* account gone, ignore */ } navigate('/login'); }} />

    </div>
  );
}

// ─── Personal Info Card ───────────────────────────────────────────────────────

type ProfileFormState = {
  fieldErrors: Partial<Record<keyof UpdateProfileValues, string>>;
  submitError: string;
  success: boolean;
  values: UpdateProfileValues;
};

function PersonalInfoCard({
  profile,
  onSaved,
}: {
  profile: UserProfile;
  onSaved: () => Promise<void>;
}) {
  const { updateProfile } = useUserService();

  async function action(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
    const values: UpdateProfileValues = {
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      gender: String(formData.get('gender') ?? '').trim(),
    };

    const fieldErrors = await validateUpdateProfile(values);
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors, submitError: '', success: false, values };
    }

    try {
      await updateProfile(values);
      await onSaved();
      return { fieldErrors: {}, submitError: '', success: true, values };
    } catch (error) {
      return {
        fieldErrors: {},
        submitError: error instanceof Error ? error.message : 'Failed to update profile',
        success: false,
        values,
      };
    }
  }

  const [state, submitAction] = useActionState(action, {
    fieldErrors: {},
    submitError: '',
    success: false,
    values: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
    },
  });

  return (
    <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
      <div className='mb-5 border-b border-gray-100 pb-4'>
        <h2 className='text-base font-semibold text-gray-900'>Personal Information</h2>
        <p className='mt-0.5 text-sm text-gray-500'>Update your name and gender</p>
      </div>

      <form action={submitAction} className='flex flex-col gap-4'>
        <div className='grid grid-cols-2 gap-4'>
          <TextField
            label='First Name'
            name='firstName'
            type='text'
            placeholder='First name'
            defaultValue={state.values.firstName}
            error={state.fieldErrors.firstName}
          />
          <TextField
            label='Last Name'
            name='lastName'
            type='text'
            placeholder='Last name'
            defaultValue={state.values.lastName}
            error={state.fieldErrors.lastName}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label className='text-sm font-medium text-gray-700'>Gender</label>
          <select
            key={state.values.gender}
            name='gender'
            defaultValue={state.values.gender}
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

        {state.success && (
          <p className='flex items-center gap-1.5 text-sm font-medium text-green-600'>
            <CheckIcon className='h-4 w-4' /> Profile updated successfully
          </p>
        )}
        <FormError message={state.submitError} />

        <div className='flex justify-end'>
          <SaveButton label='Save Changes' pendingLabel='Saving...' />
        </div>
      </form>
    </div>
  );
}

// ─── Email Card ───────────────────────────────────────────────────────────────

type EmailStep = 'idle' | 'input' | 'otp';

function EmailCard({
  profile,
  onSaved,
}: {
  profile: UserProfile;
  onSaved: () => Promise<void>;
}) {
  const { updateProfile } = useUserService();
  const { sendOtp, verifyOtp } = useAuthService();

  const [step, setStep] = useState<EmailStep>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendPending, setResendPending] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  async function handleSendOtp() {
    const err = await validateEmail(newEmail);
    if (err) { setEmailError(err); return; }
    setEmailError('');
    setSendingOtp(true);
    try {
      await sendOtp({ channel: 'EMAIL', contact: newEmail, otpType: 'SIGNUP' });
      setCountdown(RESEND_SECONDS);
      setStep('otp');
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleResend() {
    setResendError('');
    setResendPending(true);
    try {
      await sendOtp({ channel: 'EMAIL', contact: newEmail, otpType: 'SIGNUP' });
      setCountdown(RESEND_SECONDS);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend OTP');
    } finally {
      setResendPending(false);
    }
  }

  type OtpState = { submitError: string };

  async function handleOtpAction(_prev: OtpState, formData: FormData): Promise<OtpState> {
    const otp = Array.from({ length: 6 }, (_, i) =>
      String(formData.get(`otp-${i}`) ?? ''),
    ).join('');

    if (otp.length < 6) return { submitError: 'Please enter the complete 6-digit code' };

    try {
      await verifyOtp({ channel: 'EMAIL', contact: newEmail, otp, otpType: 'SIGNUP' });
      await updateProfile({ contact: { email: newEmail } });
      await onSaved();
      setStep('idle');
      setNewEmail('');
      return { submitError: '' };
    } catch (error) {
      return { submitError: error instanceof Error ? error.message : 'Invalid or expired OTP' };
    }
  }

  const [otpState, otpAction] = useActionState(handleOtpAction, { submitError: '' });

  function handleCancel() {
    setStep('idle');
    setNewEmail('');
    setEmailError('');
  }

  const currentEmail = profile.contact?.email ?? '—';

  return (
    <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
      <div className='mb-5 border-b border-gray-100 pb-4'>
        <h2 className='text-base font-semibold text-gray-900'>Email Address</h2>
        <p className='mt-0.5 text-sm text-gray-500'>Your email is used for login and notifications</p>
      </div>

      {step === 'idle' && (
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-gray-700'>Current email</p>
            <p className='mt-0.5 text-sm text-gray-900'>{currentEmail}</p>
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>New email address</label>
            <input
              type='email'
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }}
              placeholder='Enter new email'
              className={[
                'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                emailError ? 'border-red-400' : 'border-gray-300',
              ].join(' ')}
            />
            {emailError && <p className='text-xs text-red-500'>{emailError}</p>}
          </div>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={handleCancel}
              className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60'
            >
              {sendingOtp && <Spinner className='h-3.5 w-3.5' />}
              {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div className='flex flex-col gap-4'>
          <p className='text-sm text-gray-600'>
            We sent a 6-digit code to{' '}
            <span className='font-semibold text-gray-900'>{newEmail}</span>
          </p>

          <form action={otpAction} className='flex flex-col gap-4'>
            <OtpInputs error={otpState.submitError} />
            <FormError message={otpState.submitError} />

            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={handleCancel}
                className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50'
              >
                Cancel
              </button>
              <OtpVerifyButton />
            </div>

            <div className='text-sm text-gray-500'>
              {countdown > 0 ? (
                <span>
                  Resend in{' '}
                  <span className='font-semibold text-blue-600 tabular-nums'>
                    0:{String(countdown).padStart(2, '0')}
                  </span>
                </span>
              ) : (
                <button
                  type='button'
                  onClick={handleResend}
                  disabled={resendPending}
                  className='font-semibold text-blue-600 hover:underline disabled:opacity-50'
                >
                  {resendPending ? 'Sending...' : "Didn't receive it? Resend"}
                </button>
              )}
            </div>
            {resendError && <p className='text-xs text-red-500'>{resendError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Delete Account Card ──────────────────────────────────────────────────────

function DeleteAccountCard({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const { deleteMyProfile } = useUserService();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setPending(true);
    setError('');
    try {
      await deleteMyProfile();
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setPending(false);
    }
  }

  return (
    <>
      <div className='rounded-xl border border-red-100 bg-white p-6 shadow-sm'>
        <div className='mb-5 border-b border-gray-100 pb-4'>
          <h2 className='text-base font-semibold text-red-600'>Danger Zone</h2>
          <p className='mt-0.5 text-sm text-gray-500'>Irreversible actions for your account</p>
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-gray-800'>Delete Account</p>
            <p className='mt-0.5 text-sm text-gray-500'>
              Permanently delete your account and all associated data
            </p>
          </div>
          <button
            type='button'
            onClick={() => { setError(''); setOpen(true); }}
            className='rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100'
          >
            Delete Account
          </button>
        </div>
      </div>

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl'>
            {/* Icon */}
            <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
              <TrashIcon className='h-6 w-6 text-red-600' />
            </div>

            <h3 className='mb-1 text-lg font-bold text-gray-900'>Delete Account</h3>
            <p className='mb-6 text-sm text-gray-500'>
              This action is <span className='font-semibold text-gray-800'>permanent and irreversible</span>.
              All your data, backups, and settings will be deleted.
            </p>

            {error && <FormError message={error} />}

            <div className='mt-4 flex gap-3'>
              <button
                type='button'
                onClick={() => setOpen(false)}
                disabled={pending}
                className='flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleDelete}
                disabled={pending}
                className='inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60'
              >
                {pending && <Spinner className='h-3.5 w-3.5' />}
                {pending ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── OTP 6-box input ──────────────────────────────────────────────────────────

function OtpInputs({ error }: { error?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    e.target.value = digit;
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((char, i) => { if (refs.current[i]) refs.current[i]!.value = char; });
    refs.current[Math.min(digits.length, 5)]?.focus();
  }

  return (
    <div className='flex gap-2'>
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
            'h-11 w-full rounded-lg border text-center text-base font-semibold text-gray-900 outline-none transition',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function SaveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending ? 'cursor-not-allowed bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && <Spinner className='h-3.5 w-3.5' />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function OtpVerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending ? 'cursor-not-allowed bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && <Spinner className='h-3.5 w-3.5' />}
      {pending ? 'Verifying...' : 'Verify & Update'}
    </button>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? 'h-4 w-4'}`} />
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' className={className}>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className={className}>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
      <path d='M10 11v6M14 11v6' />
      <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
    </svg>
  );
}
