import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHttpRequest } from '../services/api';

/**
 * Drop any custom hooks here and wire them into createHttpRequest.
 * The returned object has the same interface as httpRequest (get/post/put/patch/delete).
 *
 * Usage:
 *   const api = useHttpRequest();
 *   api.get('/some-path');
 */
export function useHttpRequest() {
  const { logout } = useAuth();

  // Add more hooks here as needed:
  // const { token } = useSomeOtherHook();

  return useMemo(
    () =>
      createHttpRequest({
        onLogout: logout,
        // pass more config here as you add hooks above
      }),
    [logout],
  );
}
