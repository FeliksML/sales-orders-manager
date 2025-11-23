import db, { updateLastSyncTime, getLastSyncTime } from '../db/database'
import { orderService } from './orderService'
import { notificationService } from './notificationService'

class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.syncListeners = []

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('App is online')
      this.isOnline = true
      this.notifySyncListeners({ type: 'online' })
      this.syncWithServer()
    })

    window.addEventListener('offline', () => {
      console.log('App is offline')
      this.isOnline = false
      this.notifySyncListeners({ type: 'offline' })
    })
  }

  // Subscribe to sync events
  onSyncEvent(callback) {
    this.syncListeners.push(callback)
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback)
    }
  }

  // Notify all sync listeners
  notifySyncListeners(event) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in sync listener:', error)
      }
    })
  }

  // ===== ORDERS =====

  // Get all orders (offline-first)
  async getOrders(filters = {}) {
    try {
      // Always try to fetch from server if online
      if (this.isOnline) {
        try {
          const response = await orderService.getAllOrders(filters)

          // Store in IndexedDB
          await this.saveOrdersToCache(response.orders || response.data)

          return response
        } catch (error) {
          console.warn('Failed to fetch from server, using cached data:', error)
        }
      }

      // Fallback to IndexedDB
      const cachedOrders = await db.orders.toArray()

      // Apply filters to cached data
      let filtered = cachedOrders

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(order =>
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.business_name?.toLowerCase().includes(searchLower) ||
          order.customer_email?.toLowerCase().includes(searchLower) ||
          order.spectrum_reference?.toLowerCase().includes(searchLower) ||
          order.customer_account_number?.toLowerCase().includes(searchLower)
        )
      }

      if (filters.install_date_from) {
        filtered = filtered.filter(order => order.install_date >= filters.install_date_from)
      }

      if (filters.install_date_to) {
        filtered = filtered.filter(order => order.install_date <= filters.install_date_to)
      }

      return {
        orders: filtered,
        total: filtered.length,
        fromCache: true
      }
    } catch (error) {
      console.error('Error in getOrders:', error)
      throw error
    }
  }

  // Save orders to IndexedDB cache
  async saveOrdersToCache(orders) {
    if (!orders || !Array.isArray(orders)) return

    try {
      // Clear existing orders and add new ones
      await db.orders.clear()

      const ordersWithSync = orders.map(order => ({
        ...order,
        synced: true,
        cached_at: new Date().toISOString()
      }))

      await db.orders.bulkAdd(ordersWithSync)
      console.log(`Cached ${orders.length} orders to IndexedDB`)
    } catch (error) {
      console.error('Error saving orders to cache:', error)
    }
  }

  // Create order (queue if offline)
  async createOrder(orderData) {
    try {
      if (this.isOnline) {
        const newOrder = await orderService.createOrder(orderData)

        // Add to IndexedDB
        await db.orders.add({ ...newOrder, synced: true })

        return newOrder
      } else {
        // Queue for later sync
        const tempId = `temp_${Date.now()}`
        const queuedOrder = {
          ...orderData,
          orderid: tempId,
          synced: false,
          created_offline: true
        }

        await db.orders.add(queuedOrder)

        // Add to sync queue
        await db.syncQueue.add({
          operation: 'CREATE',
          entity: 'order',
          data: orderData,
          timestamp: new Date().toISOString(),
          synced: false,
          retries: 0
        })

        this.notifySyncListeners({ type: 'queued', operation: 'create_order' })

        return queuedOrder
      }
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  // Update order (queue if offline)
  async updateOrder(orderId, updates) {
    try {
      if (this.isOnline) {
        const updatedOrder = await orderService.updateOrder(orderId, updates)

        // Update in IndexedDB
        const existingOrder = await db.orders.where('orderid').equals(orderId).first()
        if (existingOrder) {
          await db.orders.update(existingOrder.id, { ...updatedOrder, synced: true })
        }

        return updatedOrder
      } else {
        // Update locally
        const existingOrder = await db.orders.where('orderid').equals(orderId).first()
        if (existingOrder) {
          await db.orders.update(existingOrder.id, {
            ...updates,
            synced: false,
            updated_offline: true
          })

          // Add to sync queue
          await db.syncQueue.add({
            operation: 'UPDATE',
            entity: 'order',
            entityId: orderId,
            data: updates,
            timestamp: new Date().toISOString(),
            synced: false,
            retries: 0
          })

          this.notifySyncListeners({ type: 'queued', operation: 'update_order' })
        }

        return { ...existingOrder, ...updates }
      }
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  // Delete order (queue if offline)
  async deleteOrder(orderId) {
    try {
      if (this.isOnline) {
        await orderService.deleteOrder(orderId)

        // Remove from IndexedDB
        const existingOrder = await db.orders.where('orderid').equals(orderId).first()
        if (existingOrder) {
          await db.orders.delete(existingOrder.id)
        }
      } else {
        // Mark as deleted locally
        const existingOrder = await db.orders.where('orderid').equals(orderId).first()
        if (existingOrder) {
          await db.orders.update(existingOrder.id, {
            deleted: true,
            synced: false
          })

          // Add to sync queue
          await db.syncQueue.add({
            operation: 'DELETE',
            entity: 'order',
            entityId: orderId,
            timestamp: new Date().toISOString(),
            synced: false,
            retries: 0
          })

          this.notifySyncListeners({ type: 'queued', operation: 'delete_order' })
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      throw error
    }
  }

  // ===== NOTIFICATIONS =====

  // Get notifications (offline-first)
  async getNotifications() {
    try {
      if (this.isOnline) {
        try {
          const notifications = await notificationService.getNotifications()

          // Store in IndexedDB
          await this.saveNotificationsToCache(notifications)

          return notifications
        } catch (error) {
          console.warn('Failed to fetch notifications from server, using cached data:', error)
        }
      }

      // Fallback to IndexedDB
      const cachedNotifications = await db.notifications
        .orderBy('created_at')
        .reverse()
        .toArray()

      return cachedNotifications
    } catch (error) {
      console.error('Error in getNotifications:', error)
      return []
    }
  }

  // Save notifications to IndexedDB cache
  async saveNotificationsToCache(notifications) {
    if (!notifications || !Array.isArray(notifications)) return

    try {
      const notificationsWithSync = notifications.map(notification => ({
        ...notification,
        synced: true,
        cached_at: new Date().toISOString()
      }))

      // Upsert notifications
      for (const notification of notificationsWithSync) {
        const existing = await db.notifications
          .where('notificationid')
          .equals(notification.notificationid)
          .first()

        if (existing) {
          await db.notifications.update(existing.id, notification)
        } else {
          await db.notifications.add(notification)
        }
      }

      console.log(`Cached ${notifications.length} notifications to IndexedDB`)
    } catch (error) {
      console.error('Error saving notifications to cache:', error)
    }
  }

  // Mark notification as read (queue if offline)
  async markNotificationAsRead(notificationId) {
    try {
      if (this.isOnline) {
        await notificationService.markAsRead(notificationId)

        // Update in IndexedDB
        const existing = await db.notifications
          .where('notificationid')
          .equals(notificationId)
          .first()

        if (existing) {
          await db.notifications.update(existing.id, { read: true, synced: true })
        }
      } else {
        // Update locally
        const existing = await db.notifications
          .where('notificationid')
          .equals(notificationId)
          .first()

        if (existing) {
          await db.notifications.update(existing.id, { read: true, synced: false })

          // Add to sync queue
          await db.syncQueue.add({
            operation: 'UPDATE',
            entity: 'notification',
            entityId: notificationId,
            data: { read: true },
            timestamp: new Date().toISOString(),
            synced: false,
            retries: 0
          })
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // ===== SYNC =====

  // Sync all pending changes with server
  async syncWithServer() {
    if (this.syncInProgress || !this.isOnline) {
      console.log('Sync skipped:', this.syncInProgress ? 'already in progress' : 'offline')
      return
    }

    this.syncInProgress = true
    this.notifySyncListeners({ type: 'sync_started' })

    try {
      // Get all unsynced items from queue
      const queuedItems = await db.syncQueue
        .filter(item => item.synced === false)
        .toArray()

      console.log(`Syncing ${queuedItems.length} queued operations...`)

      let successCount = 0
      let failureCount = 0

      for (const item of queuedItems) {
        try {
          await this.processQueueItem(item)

          // Mark as synced
          await db.syncQueue.update(item.id, { synced: true })
          successCount++
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)

          // Increment retry count
          await db.syncQueue.update(item.id, {
            retries: (item.retries || 0) + 1,
            lastError: error.message
          })
          failureCount++

          // Remove from queue after too many retries
          if (item.retries >= 3) {
            console.warn(`Removing item ${item.id} after ${item.retries} failed retries`)
            await db.syncQueue.delete(item.id)
          }
        }
      }

      // Update last sync time
      await updateLastSyncTime()

      // Fetch fresh data from server
      await this.getOrders()
      await this.getNotifications()

      console.log(`Sync completed: ${successCount} succeeded, ${failureCount} failed`)

      this.notifySyncListeners({
        type: 'sync_completed',
        success: successCount,
        failures: failureCount
      })
    } catch (error) {
      console.error('Sync error:', error)
      this.notifySyncListeners({ type: 'sync_failed', error: error.message })
    } finally {
      this.syncInProgress = false
    }
  }

  // Process a single queue item
  async processQueueItem(item) {
    switch (item.operation) {
      case 'CREATE':
        if (item.entity === 'order') {
          return await orderService.createOrder(item.data)
        }
        break

      case 'UPDATE':
        if (item.entity === 'order') {
          return await orderService.updateOrder(item.entityId, item.data)
        } else if (item.entity === 'notification') {
          return await notificationService.markAsRead(item.entityId)
        }
        break

      case 'DELETE':
        if (item.entity === 'order') {
          return await orderService.deleteOrder(item.entityId)
        }
        break

      default:
        console.warn('Unknown operation:', item.operation)
    }
  }

  // Get sync queue status
  async getSyncQueueStatus() {
    try {
      const queuedItems = await db.syncQueue
        .filter(item => item.synced === false)
        .toArray()
      const lastSync = await getLastSyncTime()

      return {
        queuedItems: queuedItems.length,
        lastSync,
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress
      }
    } catch (error) {
      console.error('Error getting sync queue status:', error)
      return {
        queuedItems: 0,
        lastSync: null,
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress
      }
    }
  }

  // Clear all offline data
  async clearOfflineData() {
    await db.orders.clear()
    await db.notifications.clear()
    await db.syncQueue.clear()
    await db.metadata.clear()
    console.log('Cleared all offline data')
  }
}

// Export singleton instance
export const offlineService = new OfflineService()
export default offlineService
