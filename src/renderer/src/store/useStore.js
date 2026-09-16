import { create } from 'zustand'
import { check as checkUpdate } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const UPDATE_DISMISSED_VERSION_KEY = 'billkeep_update_dismissed_version'

// Inizializza il tema al caricamento per evitare flash luminosi all'avvio
const initialTheme = localStorage.getItem('theme') || 'light'
document.documentElement.classList.remove('dark', 'minimal')
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else if (initialTheme === 'minimal') {
  document.documentElement.classList.add('minimal')
}

export const useStore = create((set, get) => ({
  // State
  theme: initialTheme,
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

  // Paginated lists
  paginatedInvoices: [],
  invoicesPagination: {
    limit: 50,
    offset: 0,
    totalCount: 0,
    hasMore: false,
    search: '',
    status: 'unpaid'
  },

  paginatedPayments: [],
  paymentsPagination: { limit: 50, offset: 0, totalCount: 0, hasMore: false, search: '' },

  paginatedJournalEntries: [],
  journalPagination: {
    limit: 50,
    offset: 0,
    totalCount: 0,
    hasMore: false,
    search: '',
    customerId: '',
    dateFrom: '',
    dateTo: ''
  },

  spotlightOpen: false,

  // Dashboard Redesign State
  dashboardSearch: '',
  selectedInvoiceId: null,

  // Aggiornamenti applicazione (Tauri Updater)
  updateStatus: 'idle', // idle | checking | available | up-to-date | downloading | installing | error
  updateInfo: null, // { version, currentVersion, body, date, _update }
  updateError: null,
  updateDownloadProgress: 0,

  // Actions
  setSpotlightOpen: (spotlightOpen) => set({ spotlightOpen }),
  setDashboardSearch: (dashboardSearch) => set({ dashboardSearch }),
  setSelectedInvoiceId: (selectedInvoiceId) => set({ selectedInvoiceId }),

  checkForUpdates: async () => {
    set({ updateStatus: 'checking', updateError: null })
    try {
      const update = await checkUpdate()
      if (update) {
        set({
          updateStatus: 'available',
          updateInfo: {
            version: update.version,
            currentVersion: update.currentVersion,
            body: update.body,
            date: update.date,
            _update: update
          }
        })
      } else {
        set({ updateStatus: 'up-to-date', updateInfo: null })
      }
      return update
    } catch (err) {
      console.error('Errore durante il controllo aggiornamenti:', err)
      set({ updateStatus: 'error', updateError: err?.message || String(err) })
      return null
    }
  },

  installUpdate: async () => {
    const update = get().updateInfo?._update
    if (!update) return { success: false, error: 'Nessun aggiornamento disponibile.' }

    set({ updateStatus: 'downloading', updateDownloadProgress: 0, updateError: null })
    try {
      let downloaded = 0
      let total = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          set({ updateDownloadProgress: total ? Math.round((downloaded / total) * 100) : 0 })
        } else if (event.event === 'Finished') {
          set({ updateStatus: 'installing', updateDownloadProgress: 100 })
        }
      })
      await relaunch()
      return { success: true }
    } catch (err) {
      console.error("Errore durante l'installazione dell'aggiornamento:", err)
      set({ updateStatus: 'error', updateError: err?.message || String(err) })
      return { success: false, error: err?.message || String(err) }
    }
  },

  dismissUpdate: () => {
    const version = get().updateInfo?.version
    if (version) {
      try {
        localStorage.setItem(UPDATE_DISMISSED_VERSION_KEY, version)
      } catch {
        // localStorage non disponibile: la preferenza non verrà ricordata
      }
    }
  },

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
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  updateCustomer: async (id, customerData) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.updateCustomer(id, customerData)
      if (result.success) {
        await Promise.all([
          get().fetchCustomers(),
          get().fetchStats(),
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  deleteCustomer: async (id) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.deleteCustomer(id)
      if (result.success) {
        await Promise.all([
          get().fetchCustomers(),
          get().fetchStats(),
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  updateInvoice: async (id, invoiceData) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.updateInvoice(id, invoiceData)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  deleteInvoice: async (id) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.deleteInvoice(id)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  updatePayment: async (id, paymentData) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.updatePayment(id, paymentData)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  deletePayment: async (id) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.deletePayment(id)
      if (result.success) {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchInvoicesPaginated(true),
          get().fetchStats(),
          get().fetchCustomers(),
          get().fetchPayments(),
          get().fetchPaymentsPaginated(true),
          get().fetchJournalEntries(),
          get().fetchJournalEntriesPaginated(true)
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

  fetchInvoicesPaginated: async (reset = false) => {
    const currentPagination = get().invoicesPagination
    const newOffset = reset ? 0 : currentPagination.offset + currentPagination.limit

    set({ loading: true, error: null })
    try {
      const filters = {
        limit: currentPagination.limit,
        offset: newOffset,
        search: currentPagination.search,
        status: currentPagination.status
      }

      const pageData = await window.api.getInvoicesPaginated(filters)

      set((state) => ({
        paginatedInvoices: reset
          ? pageData.invoices
          : [...state.paginatedInvoices, ...pageData.invoices],
        invoicesPagination: {
          ...state.invoicesPagination,
          offset: newOffset,
          totalCount: pageData.totalCount,
          hasMore: pageData.hasMore
        },
        loading: false
      }))
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  setInvoicesFilters: (filters) => {
    set((state) => ({
      invoicesPagination: {
        ...state.invoicesPagination,
        ...filters
      }
    }))
  },

  fetchPaymentsPaginated: async (reset = false) => {
    const currentPagination = get().paymentsPagination
    const newOffset = reset ? 0 : currentPagination.offset + currentPagination.limit

    set({ loading: true, error: null })
    try {
      const filters = {
        limit: currentPagination.limit,
        offset: newOffset,
        search: currentPagination.search
      }

      const pageData = await window.api.getPaymentsPaginated(filters)

      set((state) => ({
        paginatedPayments: reset
          ? pageData.payments
          : [...state.paginatedPayments, ...pageData.payments],
        paymentsPagination: {
          ...state.paymentsPagination,
          offset: newOffset,
          totalCount: pageData.totalCount,
          hasMore: pageData.hasMore
        },
        loading: false
      }))
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  setPaymentsFilters: (filters) => {
    set((state) => ({
      paymentsPagination: {
        ...state.paymentsPagination,
        ...filters
      }
    }))
  },

  fetchJournalEntriesPaginated: async (reset = false) => {
    const currentPagination = get().journalPagination
    const newOffset = reset ? 0 : currentPagination.offset + currentPagination.limit

    set({ loading: true, error: null })
    try {
      const filters = {
        limit: currentPagination.limit,
        offset: newOffset,
        search: currentPagination.search,
        customerId: currentPagination.customerId,
        dateFrom: currentPagination.dateFrom,
        dateTo: currentPagination.dateTo
      }

      const pageData = await window.api.getJournalEntriesPaginated(filters)

      set((state) => ({
        paginatedJournalEntries: reset
          ? pageData.journalEntries
          : [...state.paginatedJournalEntries, ...pageData.journalEntries],
        journalPagination: {
          ...state.journalPagination,
          offset: newOffset,
          totalCount: pageData.totalCount,
          hasMore: pageData.hasMore
        },
        loading: false
      }))
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  setJournalFilters: (filters) => {
    set((state) => ({
      journalPagination: {
        ...state.journalPagination,
        ...filters
      }
    }))
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.remove('dark', 'minimal')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'minimal') {
      document.documentElement.classList.add('minimal')
    }
    set({ theme })
  }
}))
