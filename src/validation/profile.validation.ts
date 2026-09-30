import * as yup from 'yup';
import { ValidationError } from 'yup';

// ── Update profile ────────────────────────────────────────────────────────────

export interface UpdateProfileValues {
  firstName: string;
  lastName: string;
  gender: string;
}

type UpdateProfileErrors = Partial<Record<keyof UpdateProfileValues, string>>;

export async function validateUpdateProfile(values: UpdateProfileValues): Promise<UpdateProfileErrors> {
  const schema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    gender: yup.string().required('Gender is required').oneOf(['MALE', 'FEMALE', 'OTHER'], 'Select a valid gender'),
  });

  try {
    await schema.validate(values, { abortEarly: false });
    return {};
  } catch (error) {
    const errors: UpdateProfileErrors = {};
    if (error instanceof ValidationError) {
      for (const issue of error.inner) {
        const field = issue.path as keyof UpdateProfileValues;
        if (field && !errors[field]) errors[field] = issue.message;
      }
    }
    return errors;
  }
}

// ── New email ─────────────────────────────────────────────────────────────────

export async function validateEmail(email: string): Promise<string> {
  const schema = yup.string().required('Email is required').email('Enter a valid email address');
  try {
    await schema.validate(email);
    return '';
  } catch (error) {
    if (error instanceof ValidationError) return error.message;
    return 'Invalid email';
  }
}
