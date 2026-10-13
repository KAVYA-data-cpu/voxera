// =========================================================
// src/lib/api.ts
//
// Central Axios instance.
// - Reads the base URL from .env (VITE_API_URL)
// - Automatically attaches the JWT token to every request
// - Intercepts 401 responses and logs the user out
// =========================================================

import axios from 'axios';

// In Vite, environment variables must start with VITE_
// We access them via import.meta.env
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create a pre-configured axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- REQUEST INTERCEPTOR ----
// Before every request, read the JWT from localStorage and
// attach it as a Bearer token in the Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('voxera_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- RESPONSE INTERCEPTOR ----
// If the server returns 401 (Unauthorized), the token has
// expired or is invalid → clear local storage and redirect
// to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('voxera_token');
      localStorage.removeItem('voxera_user');
      // Only redirect if we are NOT already on auth pages
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
