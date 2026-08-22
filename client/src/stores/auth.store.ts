import { create } from "zustand"
import type { User } from "@/types/api"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  hasCheckedAuth: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setHasCheckedAuth: (checked: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasCheckedAuth: false,
  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false, hasCheckedAuth: true }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasCheckedAuth: (hasCheckedAuth) => set({ hasCheckedAuth }),
  logout: () =>
    set({ user: null, isAuthenticated: false, isLoading: false, hasCheckedAuth: true }),
}))
