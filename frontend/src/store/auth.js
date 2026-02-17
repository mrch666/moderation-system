import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      apiKey: null,
      token: null,
      
      login: (authData) => {
        const apiKey = localStorage.getItem('api_key');
        set({
          isAuthenticated: true,
          user: authData.user,
          apiKey: apiKey,
          token: authData.token,
        });
      },
      
      logout: () => {
        localStorage.removeItem('api_key');
        set({
          isAuthenticated: false,
          user: null,
          apiKey: null,
          token: null,
        });
      },
      
      setApiKey: (apiKey) => {
        localStorage.setItem('api_key', apiKey);
        set({ apiKey });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);