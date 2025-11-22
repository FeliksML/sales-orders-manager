import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Text, Card, Chip, Searchbar, FAB } from 'react-native-paper'
import { formatDate, DATE_FORMATS, getInstallStatus } from '@sales-order-manager/shared'
import { orderService } from '../services/orderService'

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getOrders({ search })
      setOrders(response.orders || response.data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  const handleSearch = (query) => {
    setSearch(query)
    if (query.length === 0 || query.length > 2) {
      loadOrders()
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'installed': return '#4ade80'
      case 'today': return '#fbbf24'
      default: return '#60a5fa'
    }
  }

  const renderOrder = ({ item }) => {
    const status = getInstallStatus(item.install_date)
    const statusColor = getStatusColor(status)

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.orderid })}
      >
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              {item.business_name || item.customer_name}
            </Text>
            <Chip
              mode="outlined"
              style={[styles.chip, { borderColor: statusColor }]}
              textStyle={{ color: statusColor }}
            >
              {status}
            </Chip>
          </View>

          {item.business_name && (
            <Text variant="bodyMedium" style={styles.subtitle}>
              {item.customer_name}
            </Text>
          )}

          <Text variant="bodySmall" style={styles.date}>
            Install: {formatDate(item.install_date, DATE_FORMATS.DISPLAY)}
          </Text>

          <View style={styles.services}>
            {item.has_internet && <Chip compact>Internet</Chip>}
            {item.has_tv && <Chip compact>TV</Chip>}
            {item.has_mobile > 0 && <Chip compact>Mobile ({item.has_mobile})</Chip>}
            {item.has_voice > 0 && <Chip compact>Voice ({item.has_voice})</Chip>}
          </View>
        </Card.Content>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search orders..."
        onChangeText={handleSearch}
        value={search}
        style={styles.searchbar}
      />

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.orderid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">No orders found</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateOrder')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginBottom: 4,
  },
  date: {
    color: '#999',
    marginBottom: 8,
  },
  chip: {
    marginLeft: 8,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
})

export default OrdersScreen
