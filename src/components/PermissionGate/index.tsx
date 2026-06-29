import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  // The exact permission string required, e.g. 'backup.write', 'backup.delete'
  permission: string;
  children: ReactNode;
  // Optional: render something else when permission is missing (e.g. a disabled button)
  fallback?: ReactNode;
}

/**
 * Renders children only when the current user has the specified permission.
 * If not, renders `fallback` (defaults to nothing).
 *
 * Usage:
 *   <PermissionGate permission='backup.write'>
 *     <button>New Backup</button>
 *   </PermissionGate>
 *
 *   <PermissionGate permission='backup.delete' fallback={<button disabled>Delete</button>}>
 *     <button onClick={handleDelete}>Delete</button>
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { permissions } = useAuth();
  if (!permissions.includes(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
