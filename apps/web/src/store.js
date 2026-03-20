import { create } from 'zustand';

export const useStore = create((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  selectedJobs: [],
  setSelectedJobs: (jobs) => set({ selectedJobs: jobs }),
  toggleJobSelection: (jobId) =>
    set((s) => ({
      selectedJobs: s.selectedJobs.includes(jobId)
        ? s.selectedJobs.filter((id) => id !== jobId)
        : [...s.selectedJobs, jobId],
    })),
  clearSelection: () => set({ selectedJobs: [] }),

  boardFilters: {
    search: '',
    source: '',
    priority: '',
    docType: '',
    dateRange: '',
  },
  setBoardFilter: (key, value) =>
    set((s) => ({
      boardFilters: { ...s.boardFilters, [key]: value },
    })),
  resetBoardFilters: () =>
    set({
      boardFilters: {
        search: '',
        source: '',
        priority: '',
        docType: '',
        dateRange: '',
      },
    }),

  activeArtifactId: null,
  setActiveArtifact: (id) => set({ activeArtifactId: id }),

  expandedAgent: null,
  setExpandedAgent: (id) => set({ expandedAgent: id }),

  auditFilters: {
    actor: '',
    action: '',
    resource: '',
  },
  setAuditFilter: (key, value) =>
    set((s) => ({
      auditFilters: { ...s.auditFilters, [key]: value },
    })),
  resetAuditFilters: () =>
    set({
      auditFilters: { actor: '', action: '', resource: '' },
    }),
}));
