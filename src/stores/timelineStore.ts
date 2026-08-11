import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Clip {
  id: string;
  trackId: string;
  sourcePath: string;
  sourceName: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  type: 'video' | 'audio';
  // Properties
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  speed: number;
  visible: boolean;
  muted: boolean;
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  name: string;
  muted: boolean;
  locked: boolean;
  clips: string[];
}

interface TimelineState {
  tracks: Track[];
  clips: Record<string, Clip>;
  currentTime: number;
  duration: number;
  zoom: number;
  scrollX: number;
  selectedClipId: string | null;
  isPlaying: boolean;

  // Actions
  addTrack: (type: 'video' | 'audio') => void;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;

  addClip: (trackId: string, clip: Omit<Clip, 'id'>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, time: number) => void;
  toggleClipVisibility: (clipId: string) => void;
  toggleClipMute: (clipId: string) => void;

  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setScrollX: (x: number) => void;
  setSelectedClip: (clipId: string | null) => void;
  setIsPlaying: (playing: boolean) => void;

  getClipAtTime: (time: number) => Clip | null;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  tracks: [
    { id: 'video-1', type: 'video', name: 'Video 1', muted: false, locked: false, clips: [] },
    { id: 'video-2', type: 'video', name: 'Video 2', muted: false, locked: false, clips: [] },
    { id: 'audio-1', type: 'audio', name: 'Audio 1', muted: false, locked: false, clips: [] },
    { id: 'audio-2', type: 'audio', name: 'Audio 2', muted: false, locked: false, clips: [] },
  ],
  clips: {},
  currentTime: 0,
  duration: 0,
  zoom: 100,
  scrollX: 0,
  selectedClipId: null,
  isPlaying: false,

  addTrack: (type) => set((state) => {
    const count = state.tracks.filter((t) => t.type === type).length + 1;
    return {
      tracks: [...state.tracks, {
        id: `${type}-${uuidv4().slice(0, 8)}`,
        type,
        name: `${type === 'video' ? 'Video' : 'Audio'} ${count}`,
        muted: false,
        locked: false,
        clips: [],
      }],
    };
  }),

  removeTrack: (trackId) => set((state) => {
    const track = state.tracks.find((t) => t.id === trackId);
    if (!track) return state;
    const newClips = { ...state.clips };
    track.clips.forEach((id) => delete newClips[id]);
    return {
      tracks: state.tracks.filter((t) => t.id !== trackId),
      clips: newClips,
    };
  }),

  toggleTrackMute: (trackId) => set((state) => ({
    tracks: state.tracks.map((t) =>
      t.id === trackId ? { ...t, muted: !t.muted } : t
    ),
  })),

  toggleTrackLock: (trackId) => set((state) => ({
    tracks: state.tracks.map((t) =>
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ),
  })),

  addClip: (trackId, clip) => {
    const id = uuidv4();
    set((state) => {
      const newClip = { ...clip, id, trackId };
      return {
        clips: { ...state.clips, [id]: newClip },
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, id] } : t
        ),
        duration: Math.max(state.duration, clip.startTime + clip.duration),
      };
    });
    return id;
  },

  removeClip: (clipId) => set((state) => {
    const clip = state.clips[clipId];
    if (!clip) return state;
    const newClips = { ...state.clips };
    delete newClips[clipId];
    return {
      clips: newClips,
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((id) => id !== clipId),
      })),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    };
  }),

  updateClip: (clipId, updates) => set((state) => ({
    clips: {
      ...state.clips,
      [clipId]: { ...state.clips[clipId], ...updates },
    },
  })),

  moveClip: (clipId, newTrackId, newStartTime) => set((state) => {
    const clip = state.clips[clipId];
    if (!clip) return state;
    const oldTrackId = clip.trackId;
    return {
      clips: {
        ...state.clips,
        [clipId]: { ...clip, trackId: newTrackId, startTime: newStartTime },
      },
      tracks: state.tracks.map((t) => {
        if (t.id === oldTrackId) {
          return { ...t, clips: t.clips.filter((id) => id !== clipId) };
        }
        if (t.id === newTrackId) {
          return { ...t, clips: [...t.clips, clipId] };
        }
        return t;
      }),
    };
  }),

  splitClip: (clipId, time) => set((state) => {
    const clip = state.clips[clipId];
    if (!clip) return state;
    const splitPoint = time - clip.startTime;
    if (splitPoint <= 0 || splitPoint >= clip.duration) return state;

    const newClipId = uuidv4();
    const newClip: Clip = {
      ...clip,
      id: newClipId,
      startTime: time,
      duration: clip.duration - splitPoint,
      sourceStartTime: clip.sourceStartTime + splitPoint,
    };

    return {
      clips: {
        ...state.clips,
        [clipId]: { ...clip, duration: splitPoint },
        [newClipId]: newClip,
      },
      tracks: state.tracks.map((t) =>
        t.id === clip.trackId
          ? { ...t, clips: [...t.clips, newClipId] }
          : t
      ),
    };
  }),

  toggleClipVisibility: (clipId) => set((state) => ({
    clips: {
      ...state.clips,
      [clipId]: {
        ...state.clips[clipId],
        visible: !state.clips[clipId]?.visible,
      },
    },
  })),

  toggleClipMute: (clipId) => set((state) => ({
    clips: {
      ...state.clips,
      [clipId]: {
        ...state.clips[clipId],
        muted: !state.clips[clipId]?.muted,
      },
    },
  })),

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(500, zoom)) }),
  setScrollX: (x) => set({ scrollX: x }),
  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  getClipAtTime: (time) => {
    const state = get();
    for (const track of state.tracks) {
      if (track.type !== 'video') continue;
      for (const clipId of track.clips) {
        const clip = state.clips[clipId];
        if (clip && time >= clip.startTime && time < clip.startTime + clip.duration) {
          return clip;
        }
      }
    }
    return null;
  },
}));
