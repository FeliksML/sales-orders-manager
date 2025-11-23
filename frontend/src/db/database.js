import Dexie from 'dexie'

// Initialize IndexedDB database
export const db = new Dexie('SalesOrderManagerDB')

// Define database schema
db.version(1).stores({
  // Orders table with indexes for common queries
  orders: '++id, orderid, userid, customer_name, business_name, customer_email, install_date, spectrum_reference, customer_account_number, updated_at, synced',

  // Users table
  users: '++id, userid, email, name, synced',

  // Notifications table
  notifications: '++id, notificationid, userid, message, type, created_at, read, synced',

  // Sync queue for offline operations
  syncQueue: '++id, operation, entity, data, timestamp, synced, retries',

  // App metadata (last sync time, etc.)
  metadata: 'key'
})

// Helper function to mark data as synced
export const markAsSynced = async (table, id) => {
  await db[table].update(id, { synced: true, updated_at: new Date().toISOString() })
}

// Helper function to get unsynced records
export const getUnsyncedRecords = async (table) => {
  return await db[table].filter(record => record.synced === false).toArray()
}

// Clear all data (for logout)
export const clearDatabase = async () => {
  await db.orders.clear()
  await db.users.clear()
  await db.notifications.clear()
  await db.syncQueue.clear()
  await db.metadata.clear()
}

// Get last sync timestamp
export const getLastSyncTime = async () => {
  const metadata = await db.metadata.get('lastSync')
  return metadata?.value || null
}

// Update last sync timestamp
export const updateLastSyncTime = async () => {
  await db.metadata.put({ key: 'lastSync', value: new Date().toISOString() })
}

export default db
