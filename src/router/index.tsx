import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import ChangePassword from '../pages/ChangePassword';
import LoginV2 from '../pages/auth/Login/LoginV2';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import SocialLoginCallback from '../pages/auth/SocialLoginCallback';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import BackupManagementV2 from '../pages/BackupManagementV2';
import AddBackup from '../pages/BackupManagementV2/AddBackup';
import BackupDetails from '../pages/BackupManagementV2/BackupDetails';
import Connectors from '../pages/Connections/Connectors';
import SalesforceConnections from '../pages/Connections/source/SalesforceConnections';
import AWSConnections from '../pages/Connections/destination/AWSConnections';
import ConnectAWSBucket from '../pages/Connections/destination/ConnectAWSBucket';
import EditAWSBucket from '../pages/Connections/destination/EditAWSBucket';
import ArchiveVault from '../pages/ArchiveVault';
import AddArchive from '../pages/ArchiveVault/AddArchive';
import EditArchive from '../pages/ArchiveVault/EditArchive';
import ArchiveDetailScreen from '../pages/ArchiveVault/DetailScreen';
import Storage from '../pages/Storage';
import Notifications from '../pages/Notifications';
import SalesforceCallback from '../pages/callback/salesforce';
import ActivityLogs from '../pages/ActivityLogs';
import Reports from '../pages/Reports';
import AuditLogs from '../pages/AuditLogs';
import Settings from '../pages/Settings';
import RestoreCenter from '../pages/RestoreCenter';

// Ordered list of tabs and the permission prefix required to access them.
// The first entry the user has permission for becomes the landing page.
const NAV_PERMISSION_ORDER = [
  { to: '/dashboard',         permission: 'dashboard'    },
  { to: '/backup-management', permission: 'backup'       },
  { to: '/restore-center',    permission: 'restore'      },
  { to: '/archive-vault',     permission: 'archival'     },
  { to: '/connections',       permission: 'connection'   },
  { to: '/storage',           permission: 'storage'      },
  { to: '/activity-logs',     permission: 'activitylogs' },
  { to: '/reports',           permission: 'report'       },
  { to: '/settings',          permission: 'settings'     },
];

function DefaultRedirect() {
  const { hasPermission } = useAuth();
  const first = NAV_PERMISSION_ORDER.find(({ permission }) => hasPermission(permission));
  return <Navigate to={first?.to ?? '/dashboard'} replace />;
}

// Wraps a route element — redirects to the user's first allowed tab if they
// lack the required permission, instead of showing a forbidden page.
function PermissionRoute({ permission, children }: { permission: string; children: React.ReactElement }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <DefaultRedirect />;
  return children;
}

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/callback/salesforce', element: <SalesforceCallback /> },
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <DefaultRedirect /> },
          { path: '/dashboard',                          element: <PermissionRoute permission='dashboard'><Dashboard /></PermissionRoute> },
          { path: '/profile',                            element: <Profile /> },
          { path: '/change-password',                    element: <ChangePassword /> },
          { path: '/backup-management',                  element: <PermissionRoute permission='backup'><BackupManagementV2 /></PermissionRoute> },
          { path: '/backup-management/add',              element: <PermissionRoute permission='backup'><AddBackup /></PermissionRoute> },
          { path: '/backup-management-v2/details/:slug', element: <PermissionRoute permission='backup'><BackupDetails /></PermissionRoute> },
          { path: '/connections',                        element: <PermissionRoute permission='connection'><Connectors /></PermissionRoute> },
          { path: '/connections/salesforce',             element: <PermissionRoute permission='connection'><SalesforceConnections /></PermissionRoute> },
          { path: '/connections/aws',                    element: <PermissionRoute permission='connection'><AWSConnections /></PermissionRoute> },
          { path: '/connections/aws/connect',            element: <PermissionRoute permission='connection'><ConnectAWSBucket /></PermissionRoute> },
          { path: '/connections/aws/edit/:destinationId',element: <PermissionRoute permission='connection'><EditAWSBucket /></PermissionRoute> },
          { path: '/archive-vault',                      element: <PermissionRoute permission='archival'><ArchiveVault /></PermissionRoute> },
          { path: '/archive-vault/new',                  element: <PermissionRoute permission='archival'><AddArchive /></PermissionRoute> },
          { path: '/archive-vault/edit/:slug',           element: <PermissionRoute permission='archival'><EditArchive /></PermissionRoute> },
          { path: '/archive-vault/:slug',                element: <PermissionRoute permission='archival'><ArchiveDetailScreen /></PermissionRoute> },
          { path: '/storage',                            element: <PermissionRoute permission='storage'><Storage /></PermissionRoute> },
          { path: '/notifications',                      element: <Notifications /> },
          { path: '/restore-center',                     element: <PermissionRoute permission='restore'><RestoreCenter /></PermissionRoute> },
          { path: '/activity-logs',                      element: <PermissionRoute permission='activitylogs'><ActivityLogs /></PermissionRoute> },
          { path: '/audit-logs',                         element: <PermissionRoute permission='activitylogs'><AuditLogs /></PermissionRoute> },
          { path: '/reports',                            element: <PermissionRoute permission='report'><Reports /></PermissionRoute> },
          { path: '/settings',                           element: <PermissionRoute permission='settings'><Settings /></PermissionRoute> },
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginV2 /> },
      { path: '/signup', element: <Signup /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  // Standalone — no PublicRoute/ProtectedRoute wrapper intentionally.
  // PublicRoute redirects authenticated users to '/' which would unmount this
  // component before its useEffect can post the success message and close the popup.
  { path: '/login-callback/salesforce', element: <SocialLoginCallback /> },
  { path: '*', element: <NotFound /> },
]);

export default router;
