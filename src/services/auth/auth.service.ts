import type { ForgotPasswordForm, LoginForm, SignupForm } from '../../pages/auth/auth.types';
import { useHttpRequest } from '../../hooks/useHttpRequest';

export function useAuthService() {
  const api = useHttpRequest();

  return {
    login: async <TResponse>(payload: LoginForm) => (await api.post<TResponse>('/v1/auth/login', payload)).data,
    signup: async <TResponse>(payload: SignupForm) => (await api.post<TResponse>('/auth/signup', payload)).data,
    forgotPassword: async <TResponse>(payload: ForgotPasswordForm) => (await api.post<TResponse>('/auth/forgot-password', payload)).data,
    logout: async () => (await api.post('/v1/auth/logout')).data,
  };
}
