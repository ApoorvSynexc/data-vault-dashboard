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
import BackupMannagement from '../pages/BackupManagement';
import BackupDetail from '../pages/BackupManagement/BackupDetail';
import Connectors from '../pages/Connections/Connectors';
import SalesforceConnections from '../pages/Connections/source/SalesforceConnections';
import ConnectSalesforceOrg from '../pages/Connections/source/ConnectSalesforceOrg';
import AWSConnections from '../pages/Connections/destination/AWSConnections';
import ConnectAWSBucket from '../pages/Connections/destination/ConnectAWSBucket';
import ArchiveVault from '../pages/ArchiveVault';
import Storage from '../pages/Storage';
import Notifications from '../pages/Notifications';
import SalesforceCallback from '../pages/callback/salesforce';

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
          { path: '/backup-management', element: <BackupMannagement /> },
          { path: '/backup-management/:slug', element: <BackupDetail /> },
          { path: '/connections', element: <Connectors /> },
          { path: '/connections/salesforce', element: <SalesforceConnections /> },
          { path: '/connections/salesforce/connect', element: <ConnectSalesforceOrg /> },
          { path: '/connections/aws', element: <AWSConnections /> },
          { path: '/connections/aws/connect', element: <ConnectAWSBucket /> },
          { path: '/archive-vault', element: <ArchiveVault /> },
          { path: '/storage', element: <Storage /> },
          { path: '/notifications', element: <Notifications /> },
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
      { path: '/login-callback/salesforce', element: <SocialLoginCallback /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export default router;
