import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('bleBridge', {
  scan: (): Promise<{ ok: boolean; name?: string; error?: string }> =>
    ipcRenderer.invoke('ble:scan'),

  setPower: (watts: number): Promise<void> =>
    ipcRenderer.invoke('ble:set-power', watts),

  disconnect: (): Promise<void> =>
    ipcRenderer.invoke('ble:disconnect'),

  onData: (cb: (data: { power: number; cadence: number; hr: number }) => void) => {
    ipcRenderer.on('ble:data', (_: Electron.IpcRendererEvent, data) => cb(data))
  },

  onConnect: (cb: (name: string) => void) => {
    ipcRenderer.on('ble:connected', (_: Electron.IpcRendererEvent, name: string) => cb(name))
  },

  onDisconnect: (cb: (msg: string) => void) => {
    ipcRenderer.on('ble:disconnected', (_: Electron.IpcRendererEvent, msg: string) => cb(msg))
  },
})
