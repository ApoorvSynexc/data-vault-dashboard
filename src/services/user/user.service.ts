import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { UserProfile } from '../../types';

interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  gender?: string;
  contact?: { email: string };
}

export function useUserService() {
  const api = useHttpRequest();

  return {
    getMyProfile: async <TResponse = UserProfile>() => (await api.get<TResponse>('/v1/user/my-profile')).data,
    updateProfile: async <TResponse>(payload: UpdateProfilePayload) => (await api.put<TResponse>('/v1/user', payload)).data,
    changePassword: async <TResponse>(payload: { oldPassword: string; newPassword: string }) =>
      (await api.post<TResponse>('/v1/user/change-password', payload)).data,
  };
}
