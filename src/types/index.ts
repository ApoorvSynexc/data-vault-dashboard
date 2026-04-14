// Shared TypeScript types

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface User {
  id: string
  email: string
  name: string
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | string
  contact: {
    email: string
  }
  authProvider: string
  createdAt?: string
}
