import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import BackupMannagement from '../pages/BackupManagement';
import BackupDetail from '../pages/BackupManagement/BackupDetail';
import Platforms from '../pages/Platforms';
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
          { path: '/backup-management', element: <BackupMannagement /> },
          { path: '/backup-management/:slug', element: <BackupDetail /> },
          { path: '/platforms', element: <Platforms /> },
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export default router;
