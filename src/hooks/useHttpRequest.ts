import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCrmUserIdForRequest } from '../context/AuthContext';
import { createHttpRequest } from '../services/api';

export function useHttpRequest() {
  const { logout } = useAuth();

  return useMemo(
    () =>
      createHttpRequest({
        onLogout: logout,
        // Reads from the module-level ref — always current, even on the very first
        // request from AuthContext before React state has propagated.
        getCrmUserId: getCrmUserIdForRequest,
      }),
    [logout],
  );
}
