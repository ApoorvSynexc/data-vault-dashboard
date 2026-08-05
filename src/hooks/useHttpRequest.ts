import { useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHttpRequest } from '../services/api';

export function useHttpRequest() {
  const { logout, crmUserId } = useAuth();

  // Ref so getCrmUserId always reads the latest value without recreating the client
  const crmUserIdRef = useRef(crmUserId);
  crmUserIdRef.current = crmUserId;

  return useMemo(
    () =>
      createHttpRequest({
        onLogout: logout,
        getCrmUserId: () => crmUserIdRef.current || null,
      }),
    [logout],
  );
}
