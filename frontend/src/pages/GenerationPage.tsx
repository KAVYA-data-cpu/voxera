import { useState, useRef, useCallback } from 'react';
import api from '../lib/api';
import { Loader2, Upload, Download, Sparkles, AlertCircle, FileBox } from 'lucide-react';
import type { GenerationJob } from '../types';
import ModelViewer from '../components/ModelViewer';
import {
  submitTextTo3D,
  submitImageTo3D,
  getGenerationJob,
  isTerminalStatus,
} from '../services/generationService';

type InputMode = 'text' | 'image';

export default function GenerationPage() {
  const [mode, setMode] = useState<InputMode>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const pollJob = useCallback(async (id: number) => {
    setPolling(true);
    setStatusMessage('Submitted. Waiting for the remote Hunyuan3D worker...');
    try {
      let attempts = 0;
      while (attempts < 360) {
        const updated = await getGenerationJob(id);
        setJob(updated);
        if (updated.status === 'completed') {
          setStatusMessage('Generation complete. Model is ready to view and download.');
          setPolling(false);
          return;
        }
        if (updated.status === 'failed') {
          setError(updated.error || 'Generation failed.');
          setStatusMessage(null);
          setPolling(false);
          return;
        }
        setStatusMessage(`Generating 3D model... (${updated.status})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts += 1;
      }
      setError('Timed out while waiting for the generated model.');
      setStatusMessage(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? 'Unable to fetch generation status.'
          : 'Network error while polling generation status.';
      setError(message);
      setStatusMessage(null);
    } finally {
      setPolling(false);
    }
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setJob(null);
    setStatusMessage(null);

    if (mode === 'text' && prompt.trim().length < 3) {
      setError('Prompt must be at least 3 characters.');
      return;
    }
    if (mode === 'image' && !imageFile) {
      setError('Please choose an image file.');
      return;
    }

    setSubmitting(true);
    try {
      const newJob =
        mode === 'text'
          ? await submitTextTo3D({ prompt: prompt.trim() })
          : await submitImageTo3D({ file: imageFile as File });
      setJob(newJob);
      await pollJob(newJob.id);
    } catch (err: unknown) {
      let message = 'Failed to start generation.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: string } } }).response;
        if (response?.data?.detail) message = response.data.detail;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || polling;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles size={24} className="text-indigo-600 dark:text-indigo-400 stroke-[2.25]" />
            <span>AI 3D Generation</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate textured 3D assets with Tencent Hunyuan3D running on a remote GPU.
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        {/* Mode switch */}
        <div className="flex items-center gap-2">
          {(['text', 'image'] as InputMode[]).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              disabled={busy}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {value === 'text' ? 'Text to 3D' : 'Image to 3D'}
            </button>
          ))}
        </div>

        {mode === 'text' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="A futuristic drone chassis with smooth aerodynamic surfaces..."
              className="input-field text-sm"
              disabled={busy}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Source Image
            </label>
            <div
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded-lg" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Upload size={20} />
                  <span className="text-sm">Click to upload JPEG, PNG, or WebP (max 10 MB)</span>
                </div>
              )}
            </div>
            {imageFile && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{imageFile.name}</p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 text-sm text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          <span>{busy ? 'Generating...' : 'Generate 3D Model'}</span>
        </button>
      </div>

      {/* Result */}
      {job && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileBox size={18} />
              <span>Result #{job.id}</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {job.status}
            </span>
          </div>

          {job.status === 'completed' && job.model_url && (
            <>
              <ModelViewer
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${job.model_url}`}
                className="w-full h-96 rounded-xl overflow-hidden"
              />
              {job.model_url && (
                <button
                  onClick={async () => {
                    try {
                      const response = await api.get(`/generation/${job.id}/download`, { responseType: 'blob' });
                      const url = URL.createObjectURL(response.data as Blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `hunyuan3d-${job.id}.glb`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                    } catch {
                      setError('Download failed.');
                    }
                  }}
                  className="btn-secondary inline-flex items-center gap-2 text-xs"
                >
                  <Download size={14} />
                  <span>Download GLB</span>
                </button>
              )}
            </>
          )}

          {job.status === 'failed' && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-sm text-rose-600 dark:text-rose-400">
              {job.error || 'Generation failed.'}
            </div>
          )}

          {isTerminalStatus(job.status) === false && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Processing remote job...
            </div>
          )}
        </div>
      )}
    </div>
  );
}