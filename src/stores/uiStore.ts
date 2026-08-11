import { create } from 'zustand';

interface UIState {
  activePanel: 'media' | 'converter';
  propertiesOpen: boolean;
  converterOpen: boolean;

  setActivePanel: (panel: 'media' | 'converter') => void;
  toggleProperties: () => void;
  toggleConverter: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'media',
  propertiesOpen: true,
  converterOpen: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleProperties: () => set((state) => ({ propertiesOpen: !state.propertiesOpen })),
  toggleConverter: () => set((state) => ({ converterOpen: !state.converterOpen })),
}));
