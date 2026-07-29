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

// Ordered list of tabs and the permission prefixes required to access them.
// `permissions` is an OR check — tab is shown if user has ANY of the listed prefixes.
// The first entry the user has permission for becomes the landing page.
const NAV_PERMISSION_ORDER: { to: string; permissions: string[] }[] = [
  { to: '/dashboard',         permissions: ['dashboard']                                    },
  { to: '/backup-management', permissions: ['backup']                                       },
  { to: '/restore-center',    permissions: ['restore']                                      },
  { to: '/archive-vault',     permissions: ['archival']                                     },
  { to: '/connections',       permissions: ['sourceConnection', 'destinationConnection']    },
  { to: '/storage',           permissions: ['storage']                                      },
  { to: '/activity-logs',     permissions: ['activitylogs']                                 },
  { to: '/reports',           permissions: ['report']                                       },
  { to: '/settings',          permissions: ['settings']                                     },
];

function hasAny(hasPermission: (p: string) => boolean, permissions: string[]) {
  return permissions.some((p) => hasPermission(p));
}

function DefaultRedirect() {
  const { hasPermission } = useAuth();
  const first = NAV_PERMISSION_ORDER.find(({ permissions }) => hasAny(hasPermission, permissions));
  return <Navigate to={first?.to ?? '/dashboard'} replace />;
}

// Wraps a route element — redirects to the user's first allowed tab if they
// lack the required permission, instead of showing a forbidden page.
function PermissionRoute({ permissions, children }: { permissions: string[]; children: React.ReactElement }) {
  const { hasPermission } = useAuth();
  if (!hasAny(hasPermission, permissions)) return <DefaultRedirect />;
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
          { path: '/dashboard',                          element: <PermissionRoute permissions={['dashboard']}><Dashboard /></PermissionRoute> },
          { path: '/profile',                            element: <Profile /> },
          { path: '/change-password',                    element: <ChangePassword /> },
          { path: '/backup-management',                  element: <PermissionRoute permissions={['backup']}><BackupManagementV2 /></PermissionRoute> },
          { path: '/backup-management/add',              element: <PermissionRoute permissions={['backup']}><AddBackup /></PermissionRoute> },
          { path: '/backup-management-v2/details/:slug', element: <PermissionRoute permissions={['backup']}><BackupDetails /></PermissionRoute> },
          { path: '/connections',                        element: <PermissionRoute permissions={['sourceConnection', 'destinationConnection']}><Connectors /></PermissionRoute> },
          { path: '/connections/salesforce',             element: <PermissionRoute permissions={['sourceConnection']}><SalesforceConnections /></PermissionRoute> },
          { path: '/connections/aws',                    element: <PermissionRoute permissions={['destinationConnection']}><AWSConnections /></PermissionRoute> },
          { path: '/connections/aws/connect',            element: <PermissionRoute permissions={['destinationConnection']}><ConnectAWSBucket /></PermissionRoute> },
          { path: '/connections/aws/edit/:destinationId',element: <PermissionRoute permissions={['destinationConnection']}><EditAWSBucket /></PermissionRoute> },
          { path: '/archive-vault',                      element: <PermissionRoute permissions={['archival']}><ArchiveVault /></PermissionRoute> },
          { path: '/archive-vault/new',                  element: <PermissionRoute permissions={['archival']}><AddArchive /></PermissionRoute> },
          { path: '/archive-vault/edit/:slug',           element: <PermissionRoute permissions={['archival']}><EditArchive /></PermissionRoute> },
          { path: '/archive-vault/:slug',                element: <PermissionRoute permissions={['archival']}><ArchiveDetailScreen /></PermissionRoute> },
          { path: '/storage',                            element: <PermissionRoute permissions={['storage']}><Storage /></PermissionRoute> },
          { path: '/notifications',                      element: <Notifications /> },
          { path: '/restore-center',                     element: <PermissionRoute permissions={['restore']}><RestoreCenter /></PermissionRoute> },
          { path: '/restore-center/history/:jobId',      element: <PermissionRoute permissions={['restore']}><RestoreCenter /></PermissionRoute> },
          { path: '/activity-logs',                      element: <PermissionRoute permissions={['activitylogs']}><ActivityLogs /></PermissionRoute> },
          { path: '/audit-logs',                         element: <PermissionRoute permissions={['activitylogs']}><AuditLogs /></PermissionRoute> },
          { path: '/reports',                            element: <PermissionRoute permissions={['report']}><Reports /></PermissionRoute> },
          { path: '/settings',                           element: <PermissionRoute permissions={['settings']}><Settings /></PermissionRoute> },
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
