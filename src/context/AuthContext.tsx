import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthService, useUserService } from '../services';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: Record<string, unknown> | null;
  permissions: string[];
  hasPermission: (prefix: string) => boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  crmUserId: string;
  setCrmUserId: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  permissions: [],
  hasPermission: () => false,
  logout: async () => {},
  refreshProfile: async () => {},
  crmUserId: '',
  setCrmUserId: () => {},
});

function extractPermissions(profile: Record<string, unknown>): string[] {
  try {
    const role = profile.role as { permissions?: unknown } | undefined;
    const perms = role?.permissions;

    // Old shape: flat string array ["backup.read", "backup.write", ...]
    if (Array.isArray(perms)) return perms;

    // New shape: object { backup: ["read","write"], restore: ["read"], ... }
    if (perms && typeof perms === 'object') {
      return Object.entries(perms as Record<string, string[]>).flatMap(
        ([resource, actions]) => actions.map((action) => `${resource}.${action}`)
      );
    }

    return [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { logout: profileLogout } = useAuthService();
  const { getMyProfile } = useUserService();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [crmUserId, setCrmUserId] = useState<string>('');

  const hasPermission = useCallback(
    (prefix: string) => permissions.some((p) => p === prefix || p.startsWith(`${prefix}.`)),
    [permissions],
  );

  const refreshProfile = useCallback(async () => {
    const profile = await getMyProfile<Record<string, unknown>>();
    setUser(profile);
    setPermissions(profile ? extractPermissions(profile) : []);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await profileLogout();
    } catch {
      // ignore — clear state regardless
    }
    setUser(null);
    setPermissions([]);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    refreshProfile().catch(() => setStatus('unauthenticated'));
  }, []);

  const updateCrmUserId = useCallback((id: string) => {
    setCrmUserId(id);
  }, []);

  const value = useMemo(
    () => ({ status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, setCrmUserId: updateCrmUserId }),
    [status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, updateCrmUserId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
