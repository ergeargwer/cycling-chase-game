declare module '@abandonware/noble' {
  import { EventEmitter } from 'events'

  interface Noble extends EventEmitter {
    state: string
    startScanning(serviceUuids: string[], allowDuplicates: boolean): void
    stopScanning(): void
    on(event: 'stateChange', listener: (state: string) => void): this
    on(event: 'discover', listener: (peripheral: any) => void): this
  }

  const noble: Noble
  export default noble
}
