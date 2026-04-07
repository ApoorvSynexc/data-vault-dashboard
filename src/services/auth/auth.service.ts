import type { ForgotPasswordForm, LoginForm, SendOtpPayload, SignupForm, VerifyOtpPayload } from '../../pages/auth/auth.types';
import { useHttpRequest } from '../../hooks/useHttpRequest';

export function useAuthService() {
  const api = useHttpRequest();

  return {
    login: async <TResponse>(payload: LoginForm) => (await api.post<TResponse>('/v1/auth/login', payload)).data,
    signup: async <TResponse>(payload: SignupForm) => (await api.post<TResponse>('/v1/auth/signup', {
      firstName: payload.firstName,
      lastName: payload.lastName,
      contact: { email: payload.email },
      gender: payload.gender,
      password: payload.password,
      authProvider: 'EMAIL',
    })).data,
    sendOtp: async <TResponse>(payload: SendOtpPayload) => (await api.post<TResponse>('/v1/auth/send-otp', payload)).data,
    verifyOtp: async <TResponse>(payload: VerifyOtpPayload) => (await api.post<TResponse>('/v1/auth/verify-otp', payload)).data,
    forgotPassword: async <TResponse>(payload: ForgotPasswordForm) => (await api.post<TResponse>('/auth/forgot-password', payload)).data,
    logout: async () => (await api.post('/v1/auth/logout')).data,
  };
}
