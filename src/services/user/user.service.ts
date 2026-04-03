import { useHttpRequest } from '../../hooks/useHttpRequest';

export function useUserService() {
  const api = useHttpRequest();

  return {
    getMyProfile: async <TResponse>() => (await api.get<TResponse>('/v1/user/my-profile')).data,
  };
}
