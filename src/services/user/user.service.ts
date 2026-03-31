import { httpRequest } from '../api';

export const userService = {
  getMyProfile: <TResponse>() => httpRequest.get<TResponse>('/v1/user/my-profile'),
};
