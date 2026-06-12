// Archive Vault entry point.
// Fetches the list of archival configs to decide which screen to show:
//   - No configs exist → Welcome/onboarding screen
//   - Configs exist    → HomePage (list view with actions)
// Uses a 30-second stale time so the list stays reasonably fresh without
// hammering the API on every navigation.
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../services/archival/archival.service';
import ArchiveVaultHomePage from './HomePage';
import ArchiveVaultWelcome from './Welcome';

export default function ArchiveVault() {
  const archivalService = useArchivalService();

  // GET /v1/archival-config/list — determines whether to show onboarding or list
  const { data, isLoading } = useQuery({
    queryKey: ['archival-config-list'],
    queryFn: () => archivalService.getList(),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center min-h-[60vh]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600' />
          <p className='text-sm text-gray-400'>Loading Archive Vault...</p>
        </div>
      </div>
    );
  }

  // Normalise the response — API may return the array directly or wrapped in .data/.results
  const list: any[] = Array.isArray(data) ? data : ((data as any)?.data ?? (data as any)?.results ?? []);

  if (list.length === 0) return <ArchiveVaultWelcome />;

  return <ArchiveVaultHomePage />;
}
