import Dexie, { Table } from 'dexie'

export interface OfflineQueueItem {
  id?: number
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

class MealSplitDB extends Dexie {
  offlineQueue!: Table<OfflineQueueItem, number>

  constructor() {
    super('mealsplit')
    this.version(1).stores({
      offlineQueue: '++id, type, createdAt',
    })
  }
}

export const db = new MealSplitDB()
