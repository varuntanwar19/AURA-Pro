import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuraStore = create(
  persist(
    (set, get) => ({
      // Cloud & Service selection
      selectedCloud: 'azure',
      selectedService: 'iaas',
      setSelectedCloud: (cloud) => set({ selectedCloud: cloud }),
      setSelectedService: (service) => set({ selectedService: service }),

      // Language & TTS
      language: 'en',
      ttsEnabled: false,
      setLanguage: (lang) => set({ language: lang }),
      toggleTts: () => set((state) => ({ ttsEnabled: !state.ttsEnabled })),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // WebSocket connection status
      wsConnected: false,
      setWsConnected: (connected) => set({ wsConnected: connected }),

      // Active workflow
      activeWorkflow: null,
      setActiveWorkflow: (workflow) => set({ activeWorkflow: workflow }),
      clearWorkflow: () => set({ activeWorkflow: null }),

      // Workflow history
      workflowHistory: [],
      addWorkflowToHistory: (workflow) =>
        set((state) => ({
          workflowHistory: [workflow, ...state.workflowHistory].slice(0, 20),
        })),

      // Human approval queue
      humanApprovalQueue: [],
      addApproval: (approval) =>
        set((state) => ({
          humanApprovalQueue: [...state.humanApprovalQueue, approval],
        })),
      removeApproval: (id) =>
        set((state) => ({
          humanApprovalQueue: state.humanApprovalQueue.filter((a) => a.id !== id),
        })),
      updateApproval: (id, status) =>
        set((state) => ({
          humanApprovalQueue: state.humanApprovalQueue.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      // Dashboard data
      dashboardData: {
        totalResources: 0,
        activeAlerts: 0,
        aiPredictions: 0,
        workflowsRunning: 0,
        cloudHealth: {
          azure: 'healthy',
          aws: 'healthy',
          gcp: 'healthy',
        },
      },
      setDashboardData: (data) =>
        set((state) => ({ dashboardData: { ...state.dashboardData, ...data } })),

      // Alerts
      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) =>
        set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 100) })),
      clearAlerts: () => set({ alerts: [] }),

      // AI Predictions
      predictions: [],
      setPredictions: (predictions) => set({ predictions }),
      addPrediction: (prediction) =>
        set((state) => ({ predictions: [prediction, ...state.predictions].slice(0, 50) })),

      // Real-time agent messages
      agentMessages: [],
      addAgentMessage: (msg) =>
        set((state) => ({ agentMessages: [...state.agentMessages, msg].slice(-200) })),
      clearAgentMessages: () => set({ agentMessages: [] }),

      // RAG Chat history
      chatHistory: [],
      addChatMessage: (msg) =>
        set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),

      // Reset everything
      reset: () =>
        set({
          activeWorkflow: null,
          alerts: [],
          predictions: [],
          agentMessages: [],
          humanApprovalQueue: [],
        }),
    }),
    {
      name: 'aura-storage',
      partialize: (state) => ({
        selectedCloud: state.selectedCloud,
        language: state.language,
        ttsEnabled: state.ttsEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
        chatHistory: state.chatHistory.slice(-50),
        humanApprovalQueue: state.humanApprovalQueue.slice(-50),
      }),
    }
  )
);

export default useAuraStore;
