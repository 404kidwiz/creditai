import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EnhancedCreditReportData } from '@/types/enhanced-credit';

interface CreditDataState {
  // Data
  creditData: EnhancedCreditReportData | null;
  isLoading: boolean;
  error: string | null;
  
  // UI State
  selectedAccount: string | null;
  expandedSections: Set<string>;
  filters: {
    accountType: string[];
    status: string[];
    dateRange: { start: Date | null; end: Date | null };
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // User Preferences
  preferences: {
    showPII: boolean;
    theme: 'light' | 'dark';
    defaultView: 'overview' | 'detailed';
    exportFormat: 'pdf' | 'csv' | 'json';
  };
  
  // History for undo/redo
  history: EnhancedCreditReportData[];
  historyIndex: number;
  
  // Actions
  setCreditData: (data: EnhancedCreditReportData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectAccount: (accountId: string | null) => void;
  toggleSection: (sectionId: string) => void;
  setFilters: (filters: Partial<CreditDataState['filters']>) => void;
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void;
  updatePreferences: (preferences: Partial<CreditDataState['preferences']>) => void;
  
  // History actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Computed values
  getFilteredAccounts: () => any[];
  getSortedAccounts: () => any[];
  getAccountById: (id: string) => any | null;
}

export const useCreditDataStore = create<CreditDataState>()(
  persist(
    (set, get) => ({
      // Initial state
      creditData: null,
      isLoading: false,
      error: null,
      selectedAccount: null,
      expandedSections: new Set(),
      filters: {
        accountType: [],
        status: [],
        dateRange: { start: null, end: null }
      },
      sortBy: 'creditorName',
      sortOrder: 'asc',
      preferences: {
        showPII: false,
        theme: 'light',
        defaultView: 'overview',
        exportFormat: 'pdf'
      },
      history: [],
      historyIndex: -1,

      // Actions
      setCreditData: (data) => {
        set({ creditData: data, error: null });
        get().saveToHistory();
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      selectAccount: (accountId) => set({ selectedAccount: accountId }),

      toggleSection: (sectionId) => {
        const { expandedSections } = get();
        const newExpanded = new Set(expandedSections);
        
        if (newExpanded.has(sectionId)) {
          newExpanded.delete(sectionId);
        } else {
          newExpanded.add(sectionId);
        }
        
        set({ expandedSections: newExpanded });
      },

      setFilters: (newFilters) => {
        const { filters } = get();
        set({ filters: { ...filters, ...newFilters } });
      },

      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      updatePreferences: (newPreferences) => {
        const { preferences } = get();
        set({ preferences: { ...preferences, ...newPreferences } });
      },

      saveToHistory: () => {
        const { creditData, history, historyIndex } = get();
        if (!creditData) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(creditData)));
        
        // Keep only last 10 states
        if (newHistory.length > 10) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          set({
            creditData: history[newIndex],
            historyIndex: newIndex
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          set({
            creditData: history[newIndex],
            historyIndex: newIndex
          });
        }
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },

      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      getFilteredAccounts: () => {
        const { creditData, filters } = get();
        if (!creditData?.accounts) return [];

        return creditData.accounts.filter(account => {
          // Filter by account type
          if (filters.accountType.length > 0 && !filters.accountType.includes(account.accountType)) {
            return false;
          }

          // Filter by status
          if (filters.status.length > 0 && !filters.status.includes(account.status)) {
            return false;
          }

          // Filter by date range
          if (filters.dateRange.start || filters.dateRange.end) {
            const accountDate = new Date(account.openDate);
            if (filters.dateRange.start && accountDate < filters.dateRange.start) {
              return false;
            }
            if (filters.dateRange.end && accountDate > filters.dateRange.end) {
              return false;
            }
          }

          return true;
        });
      },

      getSortedAccounts: () => {
        const { sortBy, sortOrder } = get();
        const filteredAccounts = get().getFilteredAccounts();

        return [...filteredAccounts].sort((a, b) => {
          let aValue = a[sortBy as keyof typeof a];
          let bValue = b[sortBy as keyof typeof b];

          // Handle different data types
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = (bValue as string).toLowerCase();
          }

          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      },

      getAccountById: (id) => {
        const { creditData } = get();
        return creditData?.accounts.find(account => account.id === id) || null;
      }
    }),
    {
      name: 'credit-data-store',
      partialize: (state) => ({
        preferences: state.preferences,
        expandedSections: Array.from(state.expandedSections),
        filters: state.filters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.expandedSections) {
          state.expandedSections = new Set(state.expandedSections as any);
        }
      }
    }
  )
);