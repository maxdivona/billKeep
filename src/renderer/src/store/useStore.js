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

  fetchAllData: async () => {
    set({ loading: true, error: null })
    try {
      const [stats, customers, invoices, payments] = await Promise.all([
        window.api.getDashboardStats(),
        window.api.getCustomers(),
        window.api.getInvoices(),
        window.api.getPayments()
      ])
      set({ stats, customers, invoices, payments, loading: false })
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
        await Promise.all([get().fetchInvoices(), get().fetchStats(), get().fetchCustomers()])
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
          get().fetchPayments()
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
