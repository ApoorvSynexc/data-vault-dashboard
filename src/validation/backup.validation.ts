import * as yup from 'yup';
import { ValidationError } from 'yup';
import type { AzureConfig, DestinationType, GoogleConfig, S3Config } from '../pages/BackupManagement/AddBackupModal/types';

export type BackupFieldErrors = Partial<Record<string, string>>;

export async function validateBackupStep1(values: { name: string }): Promise<BackupFieldErrors> {
  const schema = yup.object({
    name: yup.string().trim().required('Backup name is required'),
  });

  try {
    await schema.validate(values, { abortEarly: false });
    return {};
  } catch (error) {
    const errors: BackupFieldErrors = {};
    if (error instanceof ValidationError) {
      for (const issue of error.inner) {
        if (issue.path && !errors[issue.path]) errors[issue.path] = issue.message;
      }
    }
    return errors;
  }
}

export async function validateBackupStep2(values: { selectedObjectIds: string[] }): Promise<BackupFieldErrors> {
  if (values.selectedObjectIds.length === 0) {
    return { objects: 'Select at least one object to backup.' };
  }
  return {};
}

export async function validateBackupStep4(values: {
  destination: DestinationType;
  s3Config: S3Config;
  googleConfig: GoogleConfig;
  azureConfig: AzureConfig;
}): Promise<BackupFieldErrors> {
  const { destination, s3Config, googleConfig, azureConfig } = values;
  const errors: BackupFieldErrors = {};

  if (destination === 'S3') {
    if (!s3Config.accessKeyId.trim()) errors.accessKeyId = 'Access Key ID is required';
    if (!s3Config.secretAccessKey.trim()) errors.secretAccessKey = 'Secret Access Key is required';
    if (!s3Config.bucketName.trim()) errors.bucketName = 'Bucket name is required';
    if (!s3Config.region) errors.region = 'Region is required';
  } else if (destination === 'Google') {
    if (!googleConfig.serviceAccountKey.trim()) errors.serviceAccountKey = 'Service Account Key is required';
    if (!googleConfig.bucketName.trim()) errors.bucketName = 'Bucket name is required';
    if (!googleConfig.projectId.trim()) errors.projectId = 'Project ID is required';
  } else if (destination === 'Azure') {
    if (!azureConfig.accountName.trim()) errors.accountName = 'Account name is required';
    if (!azureConfig.accountKey.trim()) errors.accountKey = 'Account key is required';
    if (!azureConfig.containerName.trim()) errors.containerName = 'Container name is required';
  }

  return errors;
}
