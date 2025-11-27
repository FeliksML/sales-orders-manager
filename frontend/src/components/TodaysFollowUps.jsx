import { useState } from 'react'
import { 
  Bell, Check, Clock, AlertCircle, ChevronDown, ChevronUp, 
  Phone, Building, User, Calendar, MessageSquare 
} from 'lucide-react'
import Card from './ui/Card'

function TodaysFollowUps({ followups, overdueCount, onComplete, onSnooze, onOrderClick, loading }) {
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const handleComplete = async (e, followup) => {
    e.stopPropagation()
    setActionLoading(followup.id)
    try {
      await onComplete(followup.id)
    } catch (error) {
      console.error('Failed to complete follow-up:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSnooze = async (e, followup) => {
    e.stopPropagation()
    setActionLoading(followup.id)
    try {
      await onSnooze(followup.id, 1)
    } catch (error) {
      console.error('Failed to snooze follow-up:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const isOverdue = (dueDate) => {
    const now = new Date()
    const due = new Date(dueDate)
    return due < now
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  if (!followups || followups.length === 0) {
    return null // Don't show section if no follow-ups
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Today's Follow-Ups</h2>
            <p className="text-sm text-gray-400">
              {followups.length} reminder{followups.length !== 1 ? 's' : ''} due
              {overdueCount > 0 && (
                <span className="text-red-400 ml-2">
                  ({overdueCount} overdue)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-bold">
            {followups.length}
          </span>
        </div>
      </div>

      {/* Follow-up List */}
      <div className="space-y-3">
        {followups.map((followup) => {
          const overdue = isOverdue(followup.due_date)
          const isExpanded = expandedId === followup.id
          const isLoading = actionLoading === followup.id

          return (
            <div
              key={followup.id}
              className={`rounded-xl border transition-all ${
                overdue
                  ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30'
                  : 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30'
              }`}
            >
              {/* Main Row */}
              <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-xl"
                onClick={() => toggleExpand(followup.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {overdue && (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <h3 className="text-white font-medium truncate">
                        {followup.order?.customer_name || 'Unknown Customer'}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm truncate">
                      {followup.order?.business_name || 'Unknown Business'}
                    </p>
                    {followup.note && (
                      <p className="text-gray-300 text-sm mt-2 line-clamp-1">
                        "{followup.note}"
                      </p>
                    )}
                  </div>

                  {/* Right: Time & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`text-sm font-medium ${overdue ? 'text-red-300' : 'text-blue-300'}`}>
                      <Clock className="w-4 h-4 inline mr-1" />
                      {formatTime(followup.due_date)}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => handleComplete(e, followup)}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 hover:text-green-200 transition-all disabled:opacity-50"
                        title="Mark Done"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleSnooze(e, followup)}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 hover:text-yellow-200 transition-all disabled:opacity-50"
                        title="Snooze 1 Day"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expand/Collapse */}
                    <button className="p-1 text-gray-400 hover:text-white transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Customer Details */}
                    <div className="flex items-center gap-2 text-gray-300">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{followup.order?.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span>{followup.order?.business_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a 
                        href={`tel:${followup.order?.customer_phone}`}
                        className="text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatPhone(followup.order?.customer_phone)}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        Installed: {followup.order?.install_date 
                          ? new Date(followup.order.install_date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Full Note */}
                  {followup.note && (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-300 text-sm">{followup.note}</p>
                      </div>
                    </div>
                  )}

                  {/* View Order Button */}
                  {onOrderClick && followup.order && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOrderClick(followup.order)
                      }}
                      className="mt-3 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                    >
                      View Order Details
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default TodaysFollowUps

