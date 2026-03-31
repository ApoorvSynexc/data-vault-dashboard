import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
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
