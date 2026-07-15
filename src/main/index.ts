import { app, BrowserWindow } from 'electron'
import path from 'path'
import { BleManager } from './ble-manager'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
const bleManager = new BleManager()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: '智慧騎行 追逐模式',
    backgroundColor: '#080818',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers(bleManager, mainWindow)
})

app.on('window-all-closed', () => {
  bleManager.disconnect()
  app.quit()
})
