import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Clienti
  getCustomers: () => ipcRenderer.invoke('db:get-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('db:add-customer', customer),
  getCustomerUnpaidInvoices: (customerId) =>
    ipcRenderer.invoke('db:get-customer-unpaid-invoices', customerId),
  getCustomerPayments: (customerId) => ipcRenderer.invoke('db:get-customer-payments', customerId),

  // Fatture e Pagamenti
  getInvoices: () => ipcRenderer.invoke('db:get-invoices'),
  addInvoice: (invoice) => ipcRenderer.invoke('db:add-invoice', invoice),
  getPayments: () => ipcRenderer.invoke('db:get-payments'),
  addPayment: (payment) => ipcRenderer.invoke('db:add-payment', payment),
  addMultiPayment: (paymentData) => ipcRenderer.invoke('db:add-multi-payment', paymentData),
  allocateAcconto: (data) => ipcRenderer.invoke('db:allocate-acconto', data),

  // Reportistica
  getDashboardStats: () => ipcRenderer.invoke('db:get-stats'),
  getJournalEntries: (filters) => ipcRenderer.invoke('db:get-journal-entries', filters),

  // Backup, Ripristino e Logs
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  getLogs: () => ipcRenderer.invoke('logs:get')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
