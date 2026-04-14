import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import FormError from '../../components/FormError';
import TextField from '../../components/TextField';
import EyeIcon from '../../assets/icons/eye.svg?react';
import EyeOffIcon from '../../assets/icons/eye-off.svg?react';
import { useUserService } from '../../services';
import { validateChangePassword, type ChangePasswordValues } from '../../validation';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangePasswordState = {
  fieldErrors: Partial<Record<keyof ChangePasswordValues, string>>;
  submitError: string;
  success: boolean;
};

const initialState: ChangePasswordState = {
  fieldErrors: {},
  submitError: '',
  success: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword } = useUserService();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function action(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
    const values: ChangePasswordValues = {
      oldPassword: String(formData.get('oldPassword') ?? '').trim(),
      newPassword: String(formData.get('newPassword') ?? '').trim(),
      confirmNewPassword: String(formData.get('confirmNewPassword') ?? '').trim(),
    };

    const fieldErrors = await validateChangePassword(values);
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors, submitError: '', success: false };
    }

    try {
      await changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      return { fieldErrors: {}, submitError: '', success: true };
    } catch (error) {
      return {
        fieldErrors: {},
        submitError: error instanceof Error ? error.message : 'Failed to change password',
        success: false,
      };
    }
  }

  const [state, submitAction] = useActionState(action, initialState);

  return (
    <div className='mx-auto flex max-w-lg flex-col gap-6'>
      {/* Header */}
      <div>
        <button
          type='button'
          onClick={() => navigate(-1)}
          className='mb-4 flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-800'
        >
          <ArrowLeftIcon className='h-4 w-4' />
          Back
        </button>
        <h1 className='text-xl font-bold text-gray-900'>Change Password</h1>
        <p className='mt-1 text-sm text-gray-500'>
          Choose a strong password you don't use elsewhere
        </p>
      </div>

      {/* Card */}
      <div className='rounded-xl border border-gray-100 bg-white p-8 shadow-sm'>
        {state.success ? (
          <SuccessState onBack={() => navigate('/profile')} />
        ) : (
          <form action={submitAction} className='flex flex-col gap-5'>
            <TextField
              label='Current Password'
              name='oldPassword'
              type={showOld ? 'text' : 'password'}
              placeholder='Enter your current password'
              error={state.fieldErrors.oldPassword}
              rightIcon={showOld ? <EyeOffIcon className='h-4 w-4' /> : <EyeIcon className='h-4 w-4' />}
              onRightIconClick={() => setShowOld((v) => !v)}
            />

            <div className='border-t border-gray-100' />

            <TextField
              label='New Password'
              name='newPassword'
              type={showNew ? 'text' : 'password'}
              placeholder='Enter new password'
              error={state.fieldErrors.newPassword}
              rightIcon={showNew ? <EyeOffIcon className='h-4 w-4' /> : <EyeIcon className='h-4 w-4' />}
              onRightIconClick={() => setShowNew((v) => !v)}
            />
            <TextField
              label='Confirm New Password'
              name='confirmNewPassword'
              type={showConfirm ? 'text' : 'password'}
              placeholder='Re-enter new password'
              error={state.fieldErrors.confirmNewPassword}
              rightIcon={showConfirm ? <EyeOffIcon className='h-4 w-4' /> : <EyeIcon className='h-4 w-4' />}
              onRightIconClick={() => setShowConfirm((v) => !v)}
            />

            <FormError message={state.submitError} />

            <div className='flex justify-end'>
              <SubmitButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({ onBack }: { onBack: () => void }) {
  return (
    <div className='flex flex-col items-center gap-4 py-6 text-center'>
      <div className='flex h-14 w-14 items-center justify-center rounded-full bg-green-100'>
        <CheckIcon className='h-7 w-7 text-green-600' />
      </div>
      <div>
        <p className='text-base font-semibold text-gray-900'>Password Changed</p>
        <p className='mt-1 text-sm text-gray-500'>Your password has been updated successfully</p>
      </div>
      <button
        type='button'
        onClick={onBack}
        className='mt-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700'
      >
        Back to Profile
      </button>
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-blue-300',
        pending
          ? 'cursor-not-allowed bg-blue-300 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700',
      ].join(' ')}
    >
      {pending && <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />}
      {pending ? 'Updating...' : 'Update Password'}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
      <path d='M19 12H5M5 12L12 19M5 12L12 5' />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className={className}>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  );
}
