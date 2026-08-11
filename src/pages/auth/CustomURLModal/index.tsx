import { useState } from 'react';
import { useAuthService } from '../../../services/auth/auth.service';

type CustomURLModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CustomURLModal({ isOpen, onClose }: CustomURLModalProps) {
  const authService = useAuthService();
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setCustomUrl('');
    setError(null);
  };

  const handleProceed = async () => {
    setError(null);

    const trimmed = customUrl.trim().replace(/\/$/, '');

    if (!trimmed) {
      setError('Custom URL is required for a custom environment.');
      return;
    }
    if (!trimmed.startsWith('https://')) {
      setError('Custom URL must be a secure HTTPS URL.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.initiateSocialLogin('salesforce', trimmed, 'custom');
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
        handleClose();
      } else {
        setError('No redirect URL received from server.');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              onClick={handleClose}
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>

          <h3 className='mb-1 text-xl font-semibold text-gray-900'>Login with Custom URL</h3>
          <p className='text-sm text-gray-600'>Use your custom Salesforce instance URL to log in to your DataCraft account</p>
        </div>

        {/* Content */}
        <div className='px-6 py-6'>
          {error && (
            <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
              {error}
            </div>
          )}
          <label className='block text-sm font-medium text-gray-700 mb-1.5'>Custom Salesforce URL</label>
          <input
            type='text'
            placeholder='https://yourorg.my.salesforce.com'
            value={customUrl}
            onChange={(e) => { setCustomUrl(e.target.value); setError(null); }}
            disabled={isLoading}
            onKeyDown={(e) => e.key === 'Enter' && handleProceed()}
            className='w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:opacity-60'
          />
          <p className='mt-1.5 text-xs text-gray-500'>Enter the base URL of your Salesforce instance (no trailing slash or path).</p>
        </div>

        {/* Footer */}
        <div className='border-t border-gray-100 px-6 py-4'>
          <button
            type='button'
            onClick={handleProceed}
            disabled={!customUrl.trim() || isLoading}
            className='w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isLoading ? 'Connecting...' : 'Proceed →'}
          </button>
        </div>
      </div>
    </div>
  );
}
