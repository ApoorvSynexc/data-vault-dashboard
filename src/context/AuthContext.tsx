import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuthService, useUserService } from '../services';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: Record<string, unknown> | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { logout: profileLogout } = useAuthService();
  const { getMyProfile } = useUserService();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  const refreshProfile = useCallback(async () => {
    const profile = await getMyProfile<Record<string, unknown>>();
    setUser(profile);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await profileLogout();
    } catch {
      // ignore — clear state regardless
    }
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    refreshProfile().catch(() => setStatus('unauthenticated'));
  }, []);

  return <AuthContext.Provider value={{ status, user, logout, refreshProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
