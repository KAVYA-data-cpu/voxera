// =========================================================
// src/context/AuthContext.tsx
//
// CONCEPT: React Context + useReducer for global auth state.
//
// React Context lets us share data (like the logged-in user)
// between any component without "prop drilling" (passing
// props down through every parent).
//
// useReducer is like useState but for more complex state
// transitions — similar to how Redux works.
// =========================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
} from '../types';
import api from '../lib/api';

// ---- ACTION TYPES ----
// These describe every way the auth state can change
type AuthAction =
  | { type: 'AUTH_INIT'; payload: { user: User; token: string } }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

// ---- INITIAL STATE ----
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // true on first load while we check localStorage
};

// ---- REDUCER ----
// A pure function: takes current state + action → new state
// Never mutates state directly; always returns a new object.
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT':
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ---- CONTEXT SHAPE ----
// This is what every consumer component can access
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create the context (undefined by default — enforces usage within provider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---- PROVIDER COMPONENT ----
// Wraps the whole app so all children can access auth state
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ---- ON APP LOAD: restore session from localStorage ----
  // If the user refreshes the page, we re-read the saved token
  // and user data so they don't get logged out.
  useEffect(() => {
    const token = localStorage.getItem('voxera_token');
    const userRaw = localStorage.getItem('voxera_user');

    if (token && userRaw) {
      try {
        const user: User = JSON.parse(userRaw);
        dispatch({ type: 'AUTH_INIT', payload: { user, token } });
        // Also fetch fresh user data from the API to ensure data is current
        api.get<User>('/users/me').then((res) => {
          dispatch({ type: 'UPDATE_USER', payload: res.data });
          localStorage.setItem('voxera_user', JSON.stringify(res.data));
        }).catch(() => {
          // Token is invalid/expired → log out
          localStorage.removeItem('voxera_token');
          localStorage.removeItem('voxera_user');
          dispatch({ type: 'LOGOUT' });
        });
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // ---- LOGIN ----
  // Sends credentials to /auth/login, stores token + user
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    const { access_token, user } = response.data;

    // Persist in localStorage (so page refresh keeps the session)
    localStorage.setItem('voxera_token', access_token);
    localStorage.setItem('voxera_user', JSON.stringify(user));

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user, token: access_token },
    });
  }, []);

  // ---- REGISTER ----
  // Sends new user data to /auth/register, then auto-logs-in
  const register = useCallback(async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    const { access_token, user } = response.data;

    localStorage.setItem('voxera_token', access_token);
    localStorage.setItem('voxera_user', JSON.stringify(user));

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user, token: access_token },
    });
  }, []);

  // ---- LOGOUT ----
  // Clears storage and resets auth state
  const logout = useCallback(() => {
    localStorage.removeItem('voxera_token');
    localStorage.removeItem('voxera_user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ---- UPDATE USER ----
  // Sends PATCH request to update profile and updates local state
  const updateUser = useCallback(async (data: UpdateProfileData) => {
    const response = await api.patch<User>('/users/me', data);
    const updatedUser = response.data;
    localStorage.setItem('voxera_user', JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
  }, []);

  // ---- REFRESH USER ----
  // Re-fetches current user from API (useful after settings change)
  const refreshUser = useCallback(async () => {
    const response = await api.get<User>('/users/me');
    const freshUser = response.data;
    localStorage.setItem('voxera_user', JSON.stringify(freshUser));
    dispatch({ type: 'UPDATE_USER', payload: freshUser });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- CUSTOM HOOK ----
// useAuth() gives any component access to auth state + actions.
// Throws if used outside AuthProvider (safety net).
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
