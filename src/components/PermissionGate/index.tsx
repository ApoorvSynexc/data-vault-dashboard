import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  // Single permission or array of permissions (OR logic — any one match is enough)
  permission: string | string[];
  children: ReactNode;
  // Optional: render something else when permission is missing (e.g. a disabled button)
  fallback?: ReactNode;
}

/**
 * Renders children only when the current user has the specified permission(s).
 * Pass a single string or an array — array uses OR logic (any match shows children).
 * If not, renders `fallback` (defaults to nothing).
 *
 * Usage:
 *   <PermissionGate permission='backup.write'>
 *     <button>New Backup</button>
 *   </PermissionGate>
 *
 *   <PermissionGate permission={['backup.write', 'backup.execute']}>
 *     <button>Run</button>
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { permissions } = useAuth();
  const allowed = Array.isArray(permission)
    ? permission.some((p) => permissions.includes(p))
    : permissions.includes(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
