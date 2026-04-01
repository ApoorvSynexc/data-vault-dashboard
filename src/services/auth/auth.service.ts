import type { ForgotPasswordForm, LoginForm, SignupForm } from '../../pages/auth/auth.types';
import { useHttpRequest } from '../../hooks/useHttpRequest';

export function useAuthService() {
  const api = useHttpRequest();

  return {
    login: <TResponse>(payload: LoginForm) =>
      api.post<TResponse>('/v1/auth/login', payload),
    signup: <TResponse>(payload: SignupForm) =>
      api.post<TResponse>('/auth/signup', payload),
    forgotPassword: <TResponse>(payload: ForgotPasswordForm) =>
      api.post<TResponse>('/auth/forgot-password', payload),
    logout: () =>
      api.post('/v1/auth/logout'),
  };
}
