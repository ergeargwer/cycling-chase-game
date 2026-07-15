// FTMS BLE 連接管理 — @abandonware/noble
// ThinkRider XXPRO FTMS Service 0x1826

import { EventEmitter } from 'events'

type NobleModule = typeof import('@abandonware/noble').default
let noble: NobleModule | null = null

async function getNoble(): Promise<NobleModule> {
  if (!noble) noble = (await import('@abandonware/noble')).default
  return noble
}

const FTMS_SERVICE      = '1826'
const INDOOR_BIKE_DATA  = '2ad2'
const CONTROL_POINT     = '2ad9'
const HR_SERVICE        = '180d'
const HR_MEASUREMENT    = '2a37'

export interface BikeData {
  power:   number
  cadence: number
  hr:      number
}

export class BleManager extends EventEmitter {
  private peripheral: any = null
  private controlChar: any = null
  connected = false
  deviceName = ''

  currentPower   = 0
  currentCadence = 0
  currentHr      = 0

  async scan(): Promise<void> {
    const noble = await getNoble()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        noble.stopScanning()
        reject(new Error('找不到 FTMS 裝置，請確認 ThinkRider XXPRO 已開機'))
      }, 10000)

      noble.on('stateChange', (state: string) => {
        if (state === 'poweredOn') {
          noble.startScanning([FTMS_SERVICE], false)
        }
      })

      noble.on('discover', async (peripheral: any) => {
        const name = (peripheral.advertisement.localName || '').toUpperCase()
        const isFTMS = peripheral.advertisement.serviceUuids?.includes(FTMS_SERVICE)
        const isThinkRider = name.includes('THINKRIDER') || name.includes('XXPRO')

        if (isFTMS || isThinkRider) {
          clearTimeout(timeout)
          noble.stopScanning()
          this.peripheral = peripheral

          peripheral.on('disconnect', () => {
            this.connected = false
            this.emit('disconnect', '裝置已斷線')
          })

          try {
            await this._connect(peripheral)
            resolve()
          } catch (e) {
            reject(e)
          }
        }
      })

      if (noble.state === 'poweredOn') {
        noble.startScanning([FTMS_SERVICE], false)
      }
    })
  }

  private async _connect(peripheral: any): Promise<void> {
    await new Promise<void>((res, rej) => {
      peripheral.connect((err: any) => err ? rej(err) : res())
    })

    this.deviceName = peripheral.advertisement.localName || peripheral.address

    const { characteristics } = await new Promise<any>((res, rej) => {
      peripheral.discoverSomeServicesAndCharacteristics(
        [FTMS_SERVICE, HR_SERVICE],
        [INDOOR_BIKE_DATA, CONTROL_POINT, HR_MEASUREMENT],
        (err: any, _: any, chars: any[]) => err ? rej(err) : res({ characteristics: chars })
      )
    })

    for (const char of characteristics) {
      const uuid = char.uuid

      if (uuid === INDOOR_BIKE_DATA) {
        char.on('data', (data: Buffer) => this._parseBikeData(data))
        await new Promise<void>(res => char.subscribe(() => res()))
      }

      if (uuid === CONTROL_POINT) {
        this.controlChar = char
        // 請求控制權
        await new Promise<void>(res => {
          char.write(Buffer.from([0x00]), true, () => res())
        })
      }

      if (uuid === HR_MEASUREMENT) {
        char.on('data', (data: Buffer) => this._parseHr(data))
        await new Promise<void>(res => char.subscribe(() => res()))
      }
    }

    this.connected = true
    this.emit('connect', this.deviceName)
  }

  sendTargetPower(watts: number): void {
    if (!this.controlChar || !this.connected) return
    const buf = Buffer.alloc(3)
    buf[0] = 0x05
    buf.writeInt16LE(watts, 1)
    this.controlChar.write(buf, true, () => {})
  }

  disconnect(): void {
    if (this.peripheral) {
      this.peripheral.disconnect()
    }
    this.connected = false
  }

  private _parseBikeData(data: Buffer): void {
    if (data.length < 3) return
    const flags  = data.readUInt16LE(0)
    let   offset = 2

    if (!(flags & 0x0001)) offset += 2   // Speed
    if (flags & 0x0002)    offset += 2   // Avg Speed
    if (flags & 0x0004) {                // Cadence
      if (offset + 2 <= data.length) {
        this.currentCadence = data.readUInt16LE(offset) >> 1
      }
      offset += 2
    }
    if (flags & 0x0008) offset += 2      // Avg Cadence
    if (flags & 0x0010) offset += 3      // Total Distance
    if (flags & 0x0020) offset += 2      // Resistance
    if (flags & 0x0040) {                // Power
      if (offset + 2 <= data.length) {
        this.currentPower = Math.max(0, data.readInt16LE(offset))
      }
      offset += 2
    }

    this.emit('data', {
      power:   this.currentPower,
      cadence: this.currentCadence,
      hr:      this.currentHr,
    } as BikeData)
  }

  private _parseHr(data: Buffer): void {
    const flags = data[0]
    this.currentHr = (flags & 0x01) ? data.readUInt16LE(1) : data[1]
  }
}
