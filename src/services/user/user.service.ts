import { useHttpRequest } from '../../hooks/useHttpRequest';

export function useUserService() {
  const api = useHttpRequest();

  return {
    getMyProfile: <TResponse>() => api.get<TResponse>('/v1/user/my-profile'),
  };
}
