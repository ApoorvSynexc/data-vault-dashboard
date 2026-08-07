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
  // crmId of the org the logged-in user belongs to — drives initial dropdown selection
  userCrmId: string;
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
  userCrmId: '',
});

function extractPermissions(profile: Record<string, unknown>): string[] {
  try {
    const role = profile.role as { permissions?: unknown } | undefined;
    const perms = role?.permissions;

    if (Array.isArray(perms)) return perms;

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

// Module-level ref — always holds the latest crmUserId.
// useHttpRequest reads this synchronously on every request, so even calls made
// from AuthContext itself (before React state propagates) get the right header.
let _crmUserId = '';
export function getCrmUserIdForRequest(): string { return _crmUserId; }

export function AuthProvider({ children }: { children: ReactNode }) {
  const { logout: profileLogout } = useAuthService();
  const { getMyProfile } = useUserService();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [crmUserId, _setCrmUserId] = useState<string>('');
  const [userCrmId, setUserCrmId] = useState<string>('');

  const hasPermission = useCallback(
    (prefix: string) => permissions.some((p) => p === prefix || p.startsWith(`${prefix}.`)),
    [permissions],
  );

  // Keep module-level ref in sync with state
  const setCrmUserId = useCallback((id: string) => {
    _crmUserId = id;
    _setCrmUserId(id);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getMyProfile<Record<string, unknown>>();
    setUser(profile);
    setPermissions(profile ? extractPermissions(profile) : []);
    setUserCrmId((profile?.crmId as string) ?? '');
    setStatus('authenticated');
  }, [getMyProfile]);

  const logout = useCallback(async () => {
    try {
      await profileLogout();
    } catch {
      // ignore — clear state regardless
    }
    localStorage.removeItem('selectedOrgCrmId');
    _crmUserId = '';
    _setCrmUserId('');
    setUser(null);
    setPermissions([]);
    setStatus('unauthenticated');
  }, [profileLogout]);

  useEffect(() => {
    refreshProfile().catch(() => setStatus('unauthenticated'));
  }, []);

  const value = useMemo(
    () => ({ status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, setCrmUserId, userCrmId }),
    [status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, setCrmUserId, userCrmId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
