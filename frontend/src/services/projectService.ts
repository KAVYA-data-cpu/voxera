// =========================================================
// src/services/projectService.ts
//
// FEATURE 2: Project API service layer.
//
// CONCEPT: Service Layer / API client
// Instead of writing api.get('/projects') directly inside
// every component, we centralize all project API calls here.
//
// WHY?
// - If the API URL changes, you update ONE place.
// - Components stay clean — they just call projectService.getAll()
//   without caring about HTTP details.
// - Easy to add loading/error handling in one place.
// - Easy to mock for testing.
//
// This pattern is called "Service Layer" or "Repository Pattern".
//
// DATA FLOW:
// Component → projectService → api.ts (Axios) → FastAPI → PostgreSQL
//                           ← ProjectResponse ←         ←
// =========================================================

import api from '../lib/api';
import type { Project, CreateProjectData, UpdateProjectData, ProjectFilters } from '../types';

// =========================================================
// GET /projects — List all projects with optional filters
// =========================================================
export async function getProjects(filters?: ProjectFilters): Promise<Project[]> {
  // CONCEPT: Query Parameters in Axios
  // The "params" option automatically converts an object into
  // URL query parameters:
  //   { search: 'drone', status: 'ready' }
  //   → /projects?search=drone&status=ready
  //
  // axios skips keys with undefined values, so filters.status = undefined
  // won't add ?status=undefined to the URL.
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.sort) params.sort = filters.sort;

  const response = await api.get<Project[]>('/projects', { params });
  return response.data;
}

// =========================================================
// GET /projects/{id} — Get a single project
// =========================================================
export async function getProject(id: number): Promise<Project> {
  const response = await api.get<Project>(`/projects/${id}`);
  return response.data;
}

// =========================================================
// POST /projects — Create a new project
// =========================================================
export async function createProject(data: CreateProjectData): Promise<Project> {
  // CONCEPT: POST request body
  // Axios sends data as JSON in the request body.
  // FastAPI reads it and validates with ProjectCreate schema.
  const response = await api.post<Project>('/projects', data);
  return response.data;
}

// =========================================================
// PATCH /projects/{id} — Update name / description / status
// =========================================================
export async function updateProject(id: number, data: UpdateProjectData): Promise<Project> {
  // CONCEPT: PATCH vs PUT
  // We send only the fields we want to change.
  // Backend's model_dump(exclude_unset=True) handles the rest.
  const response = await api.patch<Project>(`/projects/${id}`, data);
  return response.data;
}

// =========================================================
// DELETE /projects/{id} — Permanently delete
// =========================================================
export async function deleteProject(id: number): Promise<void> {
  // Returns 204 No Content — no response body
  await api.delete(`/projects/${id}`);
}

// =========================================================
// POST /projects/{id}/duplicate — Copy a project
// =========================================================
export async function duplicateProject(id: number): Promise<Project> {
  const response = await api.post<Project>(`/projects/${id}/duplicate`);
  return response.data;
}

// =========================================================
// POST /projects/{id}/save — Bookmark a project
// =========================================================
export async function saveProject(id: number): Promise<void> {
  await api.post(`/projects/${id}/save`);
}

// =========================================================
// DELETE /projects/{id}/save — Remove bookmark
// =========================================================
export async function unsaveProject(id: number): Promise<void> {
  await api.delete(`/projects/${id}/save`);
}
