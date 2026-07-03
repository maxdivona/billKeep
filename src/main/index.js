import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getLogs } from './logs'
import {
  initDatabase,
  getCustomers,
  addCustomer,
  getInvoices,
  addInvoice,
  addPayment,
  getPayments,
  getDashboardStats,
  getCustomerUnpaidInvoices,
  getCustomerPayments,
  addMultiPayment,
  allocateAcconto,
  getJournalEntries,
  backupDatabase,
  restoreDatabase
} from './db'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Inizializza il database SQLite locale
  initDatabase()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Registrazione canali IPC per SQLite
  ipcMain.handle('db:get-customers', () => getCustomers())
  ipcMain.handle('db:add-customer', (event, customer) => addCustomer(customer))
  ipcMain.handle('db:get-invoices', () => getInvoices())
  ipcMain.handle('db:add-invoice', (event, invoice) => addInvoice(invoice))
  ipcMain.handle('db:get-payments', () => getPayments())
  ipcMain.handle('db:add-payment', (event, payment) => addPayment(payment))
  ipcMain.handle('db:get-stats', () => getDashboardStats())
  ipcMain.handle('db:get-customer-unpaid-invoices', (event, customerId) =>
    getCustomerUnpaidInvoices(customerId)
  )
  ipcMain.handle('db:get-customer-payments', (event, customerId) => getCustomerPayments(customerId))
  ipcMain.handle('db:add-multi-payment', (event, paymentData) => addMultiPayment(paymentData))
  ipcMain.handle('db:allocate-acconto', (event, data) => allocateAcconto(data))
  ipcMain.handle('db:get-journal-entries', (event, filters) => getJournalEntries(filters))

  // Canali per Backup, Ripristino e Logs
  ipcMain.handle('db:backup', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(focusedWindow, {
      title: 'Esporta Backup Database',
      defaultPath: `billkeep_backup_${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Operazione annullata' }
    }
    return await backupDatabase(result.filePath)
  })

  ipcMain.handle('db:restore', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow, {
      title: 'Seleziona Database di Ripristino',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Operazione annullata' }
    }
    return restoreDatabase(result.filePaths[0])
  })

  ipcMain.handle('logs:get', () => getLogs())

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
