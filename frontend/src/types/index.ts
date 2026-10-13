// =========================================================
// src/types/index.ts
//
// Central TypeScript type definitions shared across the app.
// By defining types here, we avoid duplication and make the
// code self-documenting.
// =========================================================

// The safe user object returned from the API (no password hash)
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// User settings preferences
export interface UserSettings {
  id: number;
  user_id: number;
  theme: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  push_notifications: boolean;
}

// A project owned by a user
// Status values match what the backend validates:
export type ProjectStatus = 'draft' | 'generating' | 'processing' | 'ready' | 'completed' | 'failed';

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  status: ProjectStatus;
  model_file: string | null;    // Future Feature 3+: 3D model file reference
  is_saved: boolean;            // Computed by backend: did this user bookmark it?
  created_at: string;
  updated_at: string;
}

// A saved (bookmarked) project
export interface SavedProject {
  id: number;
  user_id: number;
  project_id: number;
  project: Project;
  saved_at: string;
}

// A notification for a user
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// The auth state stored globally in React context
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Payload returned after successful login/register
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Request body for login
export interface LoginCredentials {
  email: string;
  password: string;
}

// Request body for registration
export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

// For updating profile
export interface UpdateProfileData {
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

// For updating settings
export interface UpdateSettingsData {
  theme?: 'light' | 'dark' | 'system';
  email_notifications?: boolean;
  push_notifications?: boolean;
}

// ---- Feature 2: Project CRUD ----

// Data sent to POST /projects
export interface CreateProjectData {
  name: string;
  description?: string;
}

// Data sent to PATCH /projects/{id}
export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

// Query parameters for GET /projects
export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | 'all';
  sort?: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
}
