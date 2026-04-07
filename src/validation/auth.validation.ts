import * as yup from 'yup';
import { ValidationError } from 'yup';
import type { LoginForm, SignupForm } from '../pages/auth/auth.types';

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

type SignupFieldErrors = Partial<Record<keyof SignupForm, string>>;

export async function validateSignupForm(values: SignupForm): Promise<SignupFieldErrors> {
  const signupSchema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().required('Email is required').email('Enter a valid email address'),
    gender: yup.string().required('Gender is required').oneOf(['MALE', 'FEMALE', 'OTHER'], 'Select a valid gender'),
    password: yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
    confirmPassword: yup
      .string()
      .required('Please confirm your password')
      .oneOf([yup.ref('password')], 'Passwords do not match'),
  });

  try {
    await signupSchema.validate(values, { abortEarly: false });
    return {};
  } catch (error) {
    const fieldErrors: SignupFieldErrors = {};
    if (error instanceof ValidationError) {
      for (const issue of error.inner) {
        const fieldName = issue.path as keyof SignupForm;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
    }
    return fieldErrors;
  }
}
