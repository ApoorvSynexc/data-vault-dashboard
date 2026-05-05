import { useRef, useState } from 'react';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import MailIcon from '../../../assets/icons/mail.svg?react';
import { useAuthService } from '../../../services/auth/auth.service';
import { useAuth } from '../../../context/AuthContext';

type RecoverPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Step = 'email' | 'otp';

export default function RecoverPasswordModal({ isOpen, onClose }: RecoverPasswordModalProps) {
  const authService = useAuthService();
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) {
    return null;
  }

  const handleSubmitEmail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.sendOtp({
        channel: 'EMAIL',
        contact: email,
        otpType: 'LOGIN',
      });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) return;

    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({
        channel: 'EMAIL',
        contact: email,
        otp: otpValue,
        otpType: 'LOGIN',
      });
      // Token is set in cookie, refresh profile to log user in
      await refreshProfile();
      onClose();
      setStep('email');
      setEmail('');
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError(null);
  };

  const handleCloseModal = () => {
    onClose();
    setStep('email');
    setEmail('');
    setOtp(['', '', '', '', '', '']);
    setError(null);
  };

  const isOTPComplete = otp.every((digit) => digit !== '');

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4'>
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]'>
        {/* Header */}
        <div className='border-b border-gray-100 px-6 py-6'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' className='h-6 w-6 text-blue-600'>
                <rect x='5' y='13' width='14' height='8' rx='1' ry='1' />
                <path d='M7 13V9a5 5 0 0110 0v4' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
            <button
              type='button'
              onClick={handleCloseModal}
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>

          <h3 className='mb-1 text-xl font-semibold text-gray-900'>
            {step === 'email' ? 'Recover Password' : 'Enter OTP'}
          </h3>
          <p className='text-sm text-gray-600'>
            {step === 'email'
              ? 'Enter your email, verify OTP and your account will be recovered'
              : 'Enter your email, verify OTP and your account will be recovered'}
          </p>
        </div>

        {/* Content */}
        <div className='px-6 py-6'>
          {error && (
            <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
              {error}
            </div>
          )}

          {step === 'email' ? (
            <TextField
              label='Email'
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              rightIcon={<MailIcon className='h-4 w-4' />}
              disabled={isLoading}
            />
          ) : (
            <div>
              <div className='mb-4 flex gap-3 justify-center'>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type='text'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    disabled={isLoading}
                    className='h-14 w-12 rounded-lg border border-blue-500 bg-white text-center text-lg font-semibold text-blue-600 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-400'
                  />
                ))}
              </div>
              <p className='text-center text-xs text-gray-500'>
                Enter the 6-digit OTP sent to your email
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='border-t border-gray-100 px-6 py-4 space-y-3'>
          {step === 'otp' && (
            <Button
              fullWidth
              size='lg'
              variant='outline'
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          <Button
            fullWidth
            size='lg'
            onClick={step === 'email' ? handleSubmitEmail : handleVerifyOTP}
            loading={isLoading}
            disabled={step === 'email' ? !email.trim() : !isOTPComplete}
          >
            {step === 'email' ? 'GET OTP' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
