import * as yup from 'yup';
import { ValidationError } from 'yup';
import type { LoginForm } from '../pages/auth/auth.types';

type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>;

export async function validateLoginForm(values: LoginForm): Promise<LoginFieldErrors> {
  const loginSchema = yup.object({
    email: yup
      .string()
      .required('Email is required')
      .email('Enter a valid email address'),
    password: yup
      .string()
      .required('Password is required')
      .min(6, 'Password must be at least 6 characters'),
  });

  try {
    await loginSchema.validate(values, { abortEarly: false });

    return {};
  } catch (error) {
    const fieldErrors: LoginFieldErrors = {};

    if (error instanceof ValidationError) {
      for (const issue of error.inner) {
        const fieldName = issue.path;

        if (
          (fieldName === 'email' || fieldName === 'password')
          && !fieldErrors[fieldName]
        ) {
          fieldErrors[fieldName] = issue.message;
        }
      }
    }

    return fieldErrors;
  }
}
