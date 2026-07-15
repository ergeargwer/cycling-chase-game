import { ipcMain, BrowserWindow } from 'electron'
import { BleManager } from './ble-manager'

export function registerIpcHandlers(
  ble: BleManager,
  win: BrowserWindow | null
) {
  // BLE 掃描並連接
  ipcMain.handle('ble:scan', async () => {
    try {
      await ble.scan()
      return { ok: true, name: ble.deviceName }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // 發送 ERG 目標功率
  ipcMain.handle('ble:set-power', (_event, watts: number) => {
    ble.sendTargetPower(watts)
    return { ok: true }
  })

  // 斷線
  ipcMain.handle('ble:disconnect', () => {
    ble.disconnect()
    return { ok: true }
  })

  // 即時資料推送到 renderer
  ble.on('data', (data) => {
    win?.webContents.send('ble:data', data)
  })
  ble.on('connect', (name) => {
    win?.webContents.send('ble:connected', name)
  })
  ble.on('disconnect', (msg) => {
    win?.webContents.send('ble:disconnected', msg)
  })
}
