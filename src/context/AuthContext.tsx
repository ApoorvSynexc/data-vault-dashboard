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
  crmOrgId: string;
  setCrmOrgId: (id: string) => void;
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
  crmOrgId: '',
  setCrmOrgId: () => {},
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

// Module-level refs — always hold the latest values.
// Initialised from localStorage so the very first my-profile call on reload
// already carries the correct x-crm-userid / x-crm-orgid headers.
let _crmUserId = localStorage.getItem('selectedOrgCrmId') ?? '';
export function getCrmUserIdForRequest(): string { return _crmUserId; }

let _crmOrgId = localStorage.getItem('selectedOrgId') ?? '';
export function getCrmOrgIdForRequest(): string { return _crmOrgId; }

export function AuthProvider({ children }: { children: ReactNode }) {
  const { logout: profileLogout } = useAuthService();
  const { getMyProfile } = useUserService();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [crmUserId, _setCrmUserId] = useState<string>(() => localStorage.getItem('selectedOrgCrmId') ?? '');
  const [crmOrgId, _setCrmOrgId] = useState<string>(() => localStorage.getItem('selectedOrgId') ?? '');
  const [userCrmId, setUserCrmId] = useState<string>('');

  const hasPermission = useCallback(
    (prefix: string) => permissions.some((p) => p === prefix || p.startsWith(`${prefix}.`)),
    [permissions],
  );

  // Keep module-level refs in sync with state
  const setCrmUserId = useCallback((id: string) => {
    _crmUserId = id;
    _setCrmUserId(id);
  }, []);

  const setCrmOrgId = useCallback((id: string) => {
    _crmOrgId = id;
    _setCrmOrgId(id);
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
    localStorage.removeItem('selectedOrgId');
    _crmUserId = '';
    _setCrmUserId('');
    _crmOrgId = '';
    _setCrmOrgId('');
    setUser(null);
    setPermissions([]);
    setStatus('unauthenticated');
  }, [profileLogout]);

  useEffect(() => {
    refreshProfile().catch(() => setStatus('unauthenticated'));
  }, []);

  const value = useMemo(
    () => ({ status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, setCrmUserId, crmOrgId, setCrmOrgId, userCrmId }),
    [status, user, permissions, hasPermission, logout, refreshProfile, crmUserId, setCrmUserId, crmOrgId, setCrmOrgId, userCrmId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
