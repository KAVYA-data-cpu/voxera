import api from '../lib/api';
import type { GenerationJob } from '../types';

export interface SubmitTextGenerationData {
  prompt: string;
  projectId?: number;
}

export interface SubmitImageGenerationData {
  file: File;
  projectId?: number;
}

export async function submitTextTo3D(data: SubmitTextGenerationData): Promise<GenerationJob> {
  const params: Record<string, unknown> = { prompt: data.prompt };
  if (data.projectId) params.project_id = data.projectId;
  const response = await api.post<GenerationJob>('/generation/text-to-3d', params);
  return response.data;
}

export async function submitImageTo3D(data: SubmitImageGenerationData): Promise<GenerationJob> {
  const formData = new FormData();
  formData.append('file', data.file);
  if (data.projectId) formData.append('project_id', String(data.projectId));
  const response = await api.post<GenerationJob>('/generation/image-to-3d', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getGenerationJob(id: number): Promise<GenerationJob> {
  const response = await api.get<GenerationJob>(`/generation/${id}`);
  return response.data;
}

export function getGenerationDownloadUrl(id: number): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${base}/generation/${id}/download`;
}

export function isTerminalStatus(status: GenerationJob['status']): boolean {
  return status === 'completed' || status === 'failed';
}