import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { invoke } from '@tauri-apps/api/core'

// Adapter per esporre le chiamate Tauri (Rust) tramite l'oggetto window.api
// Questo mantiene la retrocompatibilità totale con le chiamate presenti nei componenti React
window.api = {
  getCustomers: () => invoke('get_customers'),
  addCustomer: (customer) => invoke('add_customer', {
    id: customer.id,
    name: customer.name,
    email: customer.email || null
  }),
  updateCustomer: (id, data) => invoke('update_customer', {
    id,
    name: data.name,
    email: data.email || null
  }),
  deleteCustomer: (id) => invoke('delete_customer', { id }),
  getCustomerUnpaidInvoices: (customerId) => invoke('get_customer_unpaid_invoices', { customerId }),
  getCustomerPayments: (customerId) => invoke('get_customer_payments', { customerId }),
  getInvoices: () => invoke('get_invoices'),
  getInvoicesPaginated: (filters) => invoke('get_invoices_paginated', {
    limit: filters.limit,
    offset: filters.offset,
    search: filters.search || null,
    status: filters.status || null
  }),
  addInvoice: (invoice) => invoke('add_invoice', { invoice }),
  updateInvoice: (id, data) => invoke('update_invoice', { id, data }),
  deleteInvoice: (id) => invoke('delete_invoice', { id }),
  getPayments: () => invoke('get_payments'),
  getPaymentsPaginated: (filters) => invoke('get_payments_paginated', {
    limit: filters.limit,
    offset: filters.offset,
    search: filters.search || null
  }),
  addPayment: (payment) => invoke('add_payment', { payment }),
  updatePayment: (id, data) => invoke('update_payment', { id, data }),
  deletePayment: (id) => invoke('delete_payment', { id }),
  addMultiPayment: (paymentData) => invoke('add_multi_payment', { paymentData }),
  allocateAcconto: (data) => invoke('allocate_acconto', { data }),
  getDashboardStats: () => invoke('get_dashboard_stats'),
  getJournalEntries: (filters) => invoke('get_journal_entries', { customerId: filters?.customerId || null }),
  getJournalEntriesPaginated: (filters) => invoke('get_journal_entries_paginated', {
    limit: filters.limit,
    offset: filters.offset,
    search: filters.search || null,
    customerId: filters.customerId || null
  }),
  getLogs: () => invoke('get_logs_command'),
  clearDatabase: () => invoke('clear_database'),
  seedDatabase: () => invoke('seed_database'),
  backupDatabase: () => invoke('backup_database_dialog'),
  restoreDatabase: () => invoke('restore_database_dialog'),
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
