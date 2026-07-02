import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // State
  stats: {
    totalInvoiced: 0,
    totalPaid: 0,
    balance: 0,
    expiredCount: 0,
    recentInvoices: [],
    recentPayments: []
  },
  customers: [],
  invoices: [],
  payments: [],
  journalEntries: [],
  loading: false,
  error: null,

  // Actions
  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const stats = await window.api.getDashboardStats()
      set({ stats, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    try {
      const customers = await window.api.getCustomers()
      set({ customers, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchInvoices: async () => {
    set({ loading: true, error: null })
    try {
      const invoices = await window.api.getInvoices()
      set({ invoices, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchPayments: async () => {
    set({ loading: true, error: null })
    try {
      const payments = await window.api.getPayments()
      set({ payments, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchJournalEntries: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const journalEntries = await window.api.getJournalEntries(filters)
      set({ journalEntries, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchAllData: async () => {
    set({ loading: true, error: null })
    try {
      const [stats, customers, invoices, payments, journalEntries] = await Promise.all([
        window.api.getDashboardStats(),
        window.api.getCustomers(),
        window.api.getInvoices(),
        window.api.getPayments(),
        window.api.getJournalEntries()
      ])
      set({ stats, customers, invoices, payments, journalEntries, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  addCustomer: async (customer) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.addCustomer(customer)
      if (result.success) {
        await get().fetchCustomers()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
    return { success: true }
  },

  addInvoice: async (invoice) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.addInvoice(invoice)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchJournalEntries()
        ])
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
    return { success: true }
  },

  addPayment: async (payment) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.addPayment(payment)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchJournalEntries()
        ])
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
    return { success: true }
  },

  addMultiPayment: async (paymentData) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.addMultiPayment(paymentData)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchJournalEntries()
        ])
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
    return { success: true }
  },

  allocateAcconto: async (data) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.allocateAcconto(data)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchJournalEntries()
        ])
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
    return { success: true }
  }
}))
