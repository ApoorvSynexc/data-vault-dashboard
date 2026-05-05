export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  firstName: string
  lastName: string
  email: string
  gender: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordForm {
  email: string
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SendOtpPayload {
  channel: 'EMAIL';
  contact: string;
  otpType: 'SIGNUP' | 'FORGOT-PASSWORD' | 'LOGIN';
}

export interface VerifyOtpPayload {
  channel: 'EMAIL';
  contact: string;
  otp: string;
  otpType: 'SIGNUP' | 'FORGOT-PASSWORD' | 'LOGIN';
}
