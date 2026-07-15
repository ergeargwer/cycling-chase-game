// IPC bridge — renderer 端封裝
// 透過 contextBridge 與 main process 溝通
// 瀏覽器預覽時自動 fallback 到 mock

export interface BikeData {
  power:   number
  cadence: number
  hr:      number
}

interface BleBridgeAPI {
  scan(): Promise<{ ok: boolean; name?: string; error?: string }>
  setPower(watts: number): Promise<void>
  disconnect(): Promise<void>
  onData(cb: (data: BikeData) => void): void
  onConnect(cb: (name: string) => void): void
  onDisconnect(cb: (msg: string) => void): void
}

declare global {
  interface Window {
    bleBridge?: BleBridgeAPI
  }
}

const mockBridge: BleBridgeAPI = {
  scan: async () => ({ ok: false, error: 'no-ble' }),
  setPower: async () => {},
  disconnect: async () => {},
  onData: () => {},
  onConnect: () => {},
  onDisconnect: () => {},
}

export const BleBridge: BleBridgeAPI = window.bleBridge ?? mockBridge
