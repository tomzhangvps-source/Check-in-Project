import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (data: LoginResponse) =>
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
      updateUser: (user: User) =>
        set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
