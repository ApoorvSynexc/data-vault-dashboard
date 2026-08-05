import { useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectedOrg } from '../layouts/MainLayout';
import { createHttpRequest } from '../services/api';

export function useHttpRequest() {
  const { logout } = useAuth();
  const { selectedOrg } = useSelectedOrg();

  // Use a ref so the getter always reads the latest org without recreating the client
  const orgRef = useRef(selectedOrg);
  orgRef.current = selectedOrg;

  return useMemo(
    () =>
      createHttpRequest({
        onLogout: logout,
        getCrmUserId: () => orgRef.current?.crmProfile?.userId ?? null,
      }),
    [logout],
  );
}
