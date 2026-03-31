export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  name: string
  email: string
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
