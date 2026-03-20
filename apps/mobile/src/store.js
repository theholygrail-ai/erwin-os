import { create } from 'zustand';

export const useStore = create((set) => ({
  themeMode: 'dark',
  toggleTheme: () =>
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
    })),

  apiBaseUrl: 'http://localhost:7001',
  setApiBaseUrl: (url) => set({ apiBaseUrl: url }),

  filters: {
    source: null,
    priority: null,
    status: null,
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  clearFilters: () =>
    set({ filters: { source: null, priority: null, status: null } }),

  selectedTab: 'Dashboard',
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  standupDeliveryTime: '09:00',
  setStandupDeliveryTime: (time) => set({ standupDeliveryTime: time }),

  whatsappNumber: '',
  setWhatsappNumber: (number) => set({ whatsappNumber: number }),
}));
