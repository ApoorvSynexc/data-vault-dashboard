// Archive Vault entry point.
// Fetches the list of archival configs to decide which screen to show:
//   - No configs + has archival.write  → Welcome/onboarding screen
//   - No configs + no archival.write   → HomePage with inline empty state
//   - Configs exist                    → HomePage (list view with actions)
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../services/archival/archival.service';
import { useAuth } from '../../context/AuthContext';
import ArchiveVaultHomePage from './HomePage';
import ArchiveVaultWelcome from './Welcome';

export default function ArchiveVault() {
  const archivalService = useArchivalService();
  const { permissions } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['archival-config-list'],
    queryFn: () => archivalService.getList(),
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

  const list: any[] = Array.isArray(data) ? data : ((data as any)?.data ?? (data as any)?.results ?? []);

  if (list.length === 0 && permissions.includes('archival.write')) return <ArchiveVaultWelcome />;

  return <ArchiveVaultHomePage />;
}
