import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  AuthUser, 
  LoginFormData, 
  RegisterFormData, 
  AuthResponse, 
  AuthError, 
  AuthTokens 
} from '../types'
import { authApi } from '../services/api'

interface AuthStore {
  // State
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  errors: AuthError[]
  error: string | null
  
  // Actions
  login: (credentials: LoginFormData) => Promise<void>
  register: (userData: RegisterFormData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  initialize: () => Promise<void>
  clearErrors: () => void
  setUser: (user: AuthUser | null) => void
  setTokens: (tokens: AuthTokens | null) => void
  
  // Getters
  getAccessToken: () => string | null
  isTokenExpired: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      errors: [],
      error: null,

      // Actions
      login: async (credentials: LoginFormData) => {
        set({ isLoading: true, errors: [] })
        
        try {
          const response = await authApi.login(credentials)
          
          set({
            user: response.user,
            tokens: {
              access_token: response.access_token,
              token_type: response.token_type,
              expires_in: response.expires_in,
              refresh_token: response.refresh_token
            },
            isAuthenticated: true,
            isLoading: false,
            errors: []
          })
        } catch (error: any) {
          const authErrors: AuthError[] = error.response?.data?.detail 
            ? [{ message: error.response.data.detail }]
            : [{ message: 'Login failed. Please try again.' }]
          
          set({
            isLoading: false,
            errors: authErrors,
            isAuthenticated: false,
            user: null,
            tokens: null
          })
          throw error
        }
      },

      register: async (userData: RegisterFormData) => {
        set({ isLoading: true, errors: [] })
        
        try {
          // Register user
          await authApi.register({
            username: userData.username,
            email: userData.email,
            password: userData.password
          })
          
          // Auto-login after registration
          await get().login({
            username: userData.username,
            password: userData.password
          })
        } catch (error: any) {
          let authErrors: AuthError[] = []
          
          if (error.response?.data?.detail) {
            if (typeof error.response.data.detail === 'string') {
              authErrors = [{ message: error.response.data.detail }]
            } else if (Array.isArray(error.response.data.detail)) {
              authErrors = error.response.data.detail.map((err: any) => ({
                message: err.msg || err.message || 'Validation error',
                field: err.loc?.[1] || undefined
              }))
            }
          } else {
            authErrors = [{ message: 'Registration failed. Please try again.' }]
          }
          
          set({
            isLoading: false,
            errors: authErrors,
            isAuthenticated: false,
            user: null,
            tokens: null
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          const tokens = get().tokens
          if (tokens?.access_token) {
            await authApi.logout(tokens.access_token)
          }
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error)
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            errors: []
          })
        }
      },

      refreshToken: async () => {
        const tokens = get().tokens
        if (!tokens?.refresh_token) {
          throw new Error('No refresh token available')
        }
        
        try {
          const response = await authApi.refreshToken(tokens.refresh_token)
          
          set({
            tokens: {
              access_token: response.access_token,
              token_type: response.token_type,
              expires_in: response.expires_in,
              refresh_token: tokens.refresh_token // Keep existing refresh token
            },
            user: response.user
          })
        } catch (error) {
          // Refresh failed, logout user
          await get().logout()
          throw error
        }
      },

      initialize: async () => {
        const tokens = get().tokens
        if (!tokens?.access_token) {
          set({ isAuthenticated: false, user: null })
          return
        }
        
        // Check if token is expired
        if (get().isTokenExpired()) {
          try {
            await get().refreshToken()
          } catch (error) {
            set({ isAuthenticated: false, user: null, tokens: null })
            return
          }
        }
        
        // Token is valid, ensure authentication state is correct
        set({ isAuthenticated: true })
      },

      clearErrors: () => {
        set({ errors: [] })
      },

      setUser: (user: AuthUser | null) => {
        set({ user, isAuthenticated: !!user })
      },

      setTokens: (tokens: AuthTokens | null) => {
        set({ tokens })
      },

      // Getters
      getAccessToken: () => {
        const tokens = get().tokens
        return tokens?.access_token || null
      },

      isTokenExpired: () => {
        const tokens = get().tokens
        if (!tokens?.expires_in) return true
        
        // Check if token will expire in the next 5 minutes
        const expirationTime = Date.now() + (tokens.expires_in * 1000)
        const bufferTime = 5 * 60 * 1000 // 5 minutes
        
        return expirationTime <= Date.now() + bufferTime
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Auto-refresh token when it's about to expire
const setupTokenRefresh = () => {
  setInterval(async () => {
    const store = useAuthStore.getState()
    if (store.isAuthenticated && store.isTokenExpired()) {
      try {
        await store.refreshToken()
      } catch (error) {
        console.warn('Auto token refresh failed:', error)
      }
    }
  }, 5 * 60 * 1000) // Check every 5 minutes
}

// Initialize token refresh when store is created
if (typeof window !== 'undefined') {
  setupTokenRefresh()
}