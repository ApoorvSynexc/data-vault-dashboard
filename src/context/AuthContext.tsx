import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService, userService } from '../services';
import { registerLogoutHandler } from '../services/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: Record<string, unknown> | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — clear state regardless
    }
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    registerLogoutHandler(logout);
  }, [logout]);

  useEffect(() => {
    userService
      .getMyProfile<Record<string, unknown>>()
      .then((profile) => {
        setUser(profile);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  return <AuthContext.Provider value={{ status, user, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
