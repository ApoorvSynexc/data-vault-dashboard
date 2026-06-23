import { createBrowserRouter } from 'react-router-dom';
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
import BackupDetail from '../pages/BackupManagement/BackupDetail';
import Connectors from '../pages/Connections/Connectors';
import SalesforceConnections from '../pages/Connections/source/SalesforceConnections';
import ConnectSalesforceOrg from '../pages/Connections/source/ConnectSalesforceOrg';
import EditSalesforceConnection from '../pages/Connections/source/EditSalesforceConnection';
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
import RestoreCenter from '../pages/RestoreCenter';
import ActivityLogs from '../pages/ActivityLogs';
import Reports from '../pages/Reports';
import AuditLogs from '../pages/AuditLogs';
import Settings from '../pages/Settings';

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/callback/salesforce', element: <SalesforceCallback /> },
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: '/profile', element: <Profile /> },
          { path: '/change-password', element: <ChangePassword /> },
          { path: '/backup-management', element: <BackupManagementV2 /> },
          { path: '/backup-management/add', element: <AddBackup /> },
          { path: '/backup-management-v2/details/:slug', element: <BackupDetails /> },
          { path: '/backup-management/:slug', element: <BackupDetail /> },
          { path: '/connections', element: <Connectors /> },
          { path: '/connections/salesforce', element: <SalesforceConnections /> },
          { path: '/connections/salesforce/connect', element: <ConnectSalesforceOrg /> },
          { path: '/connections/salesforce/edit/:crmId', element: <EditSalesforceConnection /> },
          { path: '/connections/aws', element: <AWSConnections /> },
          { path: '/connections/aws/connect', element: <ConnectAWSBucket /> },
          { path: '/connections/aws/edit/:destinationId', element: <EditAWSBucket /> },
          { path: '/archive-vault', element: <ArchiveVault /> },
          { path: '/archive-vault/new', element: <AddArchive /> },
          { path: '/archive-vault/edit/:slug', element: <EditArchive /> },
          { path: '/archive-vault/:slug', element: <ArchiveDetailScreen /> },
          { path: '/storage', element: <Storage /> },
          { path: '/notifications', element: <Notifications /> },
          { path: '/restore-center', element: <RestoreCenter /> },
          { path: '/activity-logs', element: <ActivityLogs /> },
          { path: '/audit-logs', element: <AuditLogs /> },
          { path: '/reports', element: <Reports /> },
          { path: '/settings', element: <Settings /> },
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
