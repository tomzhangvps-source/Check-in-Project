import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  isLoading: boolean;
  currentPage: 'login' | 'checkin' | 'admin';
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setCurrentPage: (page: 'login' | 'checkin' | 'admin') => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  isLoading: false,
  currentPage: 'login',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
