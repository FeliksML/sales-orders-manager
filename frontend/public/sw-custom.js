// Custom service worker with Background Sync API support

// Register background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag)

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders())
  }
})

// Sync orders with server
async function syncOrders() {
  try {
    console.log('Starting background sync...')

    // Open IndexedDB
    const db = await openDatabase()

    // Get unsynced items from sync queue
    const unsyncedItems = await getUnsyncedItems(db)

    console.log(`Found ${unsyncedItems.length} items to sync`)

    for (const item of unsyncedItems) {
      try {
        await syncItem(item)

        // Mark as synced in IndexedDB
        await markItemSynced(db, item.id)

        console.log(`Synced item ${item.id}`)
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error)

        // Increment retry count
        await incrementRetryCount(db, item.id)
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: unsyncedItems.length
      })
    })

    console.log('Background sync complete')
  } catch (error) {
    console.error('Background sync failed:', error)
    throw error
  }
}

// Open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SalesOrderManagerDB', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// Get unsynced items from sync queue
function getUnsyncedItems(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly')
    const store = transaction.objectStore('syncQueue')
    const index = store.index('synced')
    const request = index.getAll(false)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// Sync individual item with server
async function syncItem(item) {
  const { operation, entity, entityId, data } = item

  let url = `${self.location.origin}/api`
  let method = 'POST'
  let body = data

  switch (operation) {
    case 'CREATE':
      url += `/${entity}s`
      method = 'POST'
      break

    case 'UPDATE':
      url += `/${entity}s/${entityId}`
      method = 'PUT'
      break

    case 'DELETE':
      url += `/${entity}s/${entityId}`
      method = 'DELETE'
      body = null
      break

    default:
      throw new Error(`Unknown operation: ${operation}`)
  }

  // Get auth token from IndexedDB or session storage
  const token = await getAuthToken()

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: body ? JSON.stringify(body) : null
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

// Get auth token
async function getAuthToken() {
  // Try to get from clients
  const clients = await self.clients.matchAll()

  for (const client of clients) {
    try {
      const response = await new Promise((resolve) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = (event) => resolve(event.data)

        client.postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2])

        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000)
      })

      if (response && response.token) {
        return response.token
      }
    } catch (error) {
      console.error('Error getting auth token from client:', error)
    }
  }

  return null
}

// Mark item as synced
function markItemSynced(db, itemId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const request = store.put({ id: itemId, synced: true })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Increment retry count
function incrementRetryCount(db, itemId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const getRequest = store.get(itemId)

    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (item) {
        item.retries = (item.retries || 0) + 1
        const putRequest = store.put(item)

        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      } else {
        resolve()
      }
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_SYNC') {
    // Register background sync
    self.registration.sync.register('sync-orders')
      .then(() => {
        console.log('Background sync registered')
      })
      .catch((error) => {
        console.error('Failed to register background sync:', error)
      })
  }
})

console.log('Custom service worker loaded')
