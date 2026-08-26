import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { HttpError } from '../../../../services/api';

type Props = {
  backupConfigId: string;
  slug: string;
  objectApiName: string;
  onClose: () => void;
};

export default function RecoveryModal({ backupConfigId, slug, objectApiName, onClose }: Props) {
  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const [recordId, setRecordId] = useState('');

  const recoverMutation = useMutation({
    mutationFn: () => backupConfigService.recoverTrigger({ backupConfigId, objectApiName, recordId: recordId.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-detail', slug] });
    },
  });

  const errorMessage = recoverMutation.isError
    ? recoverMutation.error instanceof HttpError
      ? recoverMutation.error.message
      : 'Trigger recovery failed. Please contact support.'
    : null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
      <div className='bg-white rounded-2xl w-full flex flex-col' style={{ maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div className='flex items-center justify-between px-6 pt-6 pb-4' style={{ borderBottom: '1.5px solid #F1F5F9' }}>
          <h2 className='font-bold text-lg text-gray-900'>Recover Failed Trigger</h2>
          <button onClick={onClose} className='p-2 rounded-lg hover:bg-gray-100 transition text-gray-500'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='px-6 py-5 space-y-4'>
          {recoverMutation.isSuccess ? (
            <div className='flex flex-col items-center text-center py-4'>
              <div className='w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3'>
                <svg className='w-5 h-5 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
                </svg>
              </div>
              <p className='text-sm font-medium text-gray-900'>Trigger recovered successfully</p>
              <p className='text-xs text-gray-500 mt-1'>The Apex Trigger for {objectApiName} was recreated.</p>
            </div>
          ) : (
            <>
              <p className='text-sm text-gray-600'>
                The Apex Trigger for <span className='font-semibold text-gray-900'>{objectApiName}</span> failed to create.
                To retry, provide the Id of an existing {objectApiName} record — it will be used to satisfy Salesforce's
                test coverage requirement for the trigger.
              </p>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1.5'>{objectApiName} Record Id</label>
                <input
                  type='text'
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder='e.g. 001XXXXXXXXXXXXXXX'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  disabled={recoverMutation.isPending}
                />
              </div>
              {errorMessage && (
                <p className='text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>{errorMessage}</p>
              )}
            </>
          )}
        </div>

        <div className='flex items-center justify-end gap-3 px-6 py-4' style={{ borderTop: '1.5px solid #F1F5F9' }}>
          <button onClick={onClose} className='px-5 py-2 text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
            {recoverMutation.isSuccess ? 'Close' : 'Cancel'}
          </button>
          {!recoverMutation.isSuccess && (
            <button
              onClick={() => recoverMutation.mutate()}
              disabled={!recordId.trim() || recoverMutation.isPending}
              className='px-5 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {recoverMutation.isPending ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
