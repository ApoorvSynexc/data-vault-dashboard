import type { ForgotPasswordForm, LoginForm, SignupForm } from '../../pages/auth/auth.types'
import { httpRequest } from '../api'

export const authService = {
  login: <TResponse>(payload: LoginForm) =>
    httpRequest.post<TResponse>('/auth/login', payload),
  signup: <TResponse>(payload: SignupForm) =>
    httpRequest.post<TResponse>('/auth/signup', payload),
  forgotPassword: <TResponse>(payload: ForgotPasswordForm) =>
    httpRequest.post<TResponse>('/auth/forgot-password', payload),
}
