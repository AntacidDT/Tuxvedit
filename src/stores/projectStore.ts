import { create } from 'zustand';

export interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: 'video' | 'audio';
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: number[];
}

interface ProjectState {
  name: string;
  mediaFiles: MediaFile[];
  fps: number;
  resolution: { width: number; height: number };

  setName: (name: string) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  setFps: (fps: number) => void;
  setResolution: (width: number, height: number) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  name: 'Untitled Project',
  mediaFiles: [],
  fps: 30,
  resolution: { width: 1920, height: 1080 },

  setName: (name) => set({ name }),
  addMediaFile: (file) => set((state) => ({
    mediaFiles: [...state.mediaFiles, file],
  })),
  removeMediaFile: (id) => set((state) => ({
    mediaFiles: state.mediaFiles.filter((f) => f.id !== id),
  })),
  setFps: (fps) => set({ fps }),
  setResolution: (width, height) => set({ resolution: { width, height } }),
}));
