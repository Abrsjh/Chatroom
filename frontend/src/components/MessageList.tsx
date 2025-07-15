import { useEffect, useRef, useState } from 'react'
import { useMessageStore } from '../stores'
import { Message } from '../types'
import './MessageList.css'

interface MessageListProps {
  otherUserId: string
  pollingInterval?: number
  otherUserLastSeen?: Date
}

const MessageList: React.FC<MessageListProps> = ({ 
  otherUserId, 
  pollingInterval = 5000,
  otherUserLastSeen 
}) => {
  const {
    messages,
    loading,
    error,
    pollingInterval: activePollingInterval,
    isOtherUserTyping,
    isOffline,
    fetchMessages,
    markAsRead,
    deleteMessage,
    startPolling,
    stopPolling
  } = useMessageStore()

  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false)
  const [isVisible, setIsVisible] = useState(!document.hidden)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLength = useRef(messages.length)

  // Mock current user ID - in real app this would come from auth context
  const currentUserId = 'user1'

  // Handle visibility change for adaptive polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsVisible(visible)
      
      if (visible) {
        // Resume normal polling when tab becomes visible
        startPolling(otherUserId, pollingInterval)
      } else {
        // Reduce polling frequency when tab is hidden
        stopPolling()
        startPolling(otherUserId, 30000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [otherUserId, pollingInterval, startPolling, stopPolling])

  // Handle online/offline state
  useEffect(() => {
    if (isOffline) {
      stopPolling()
    } else if (isVisible) {
      startPolling(otherUserId, pollingInterval)
    }
  }, [isOffline, isVisible, otherUserId, pollingInterval, startPolling, stopPolling])

  // Handle polling interval changes
  useEffect(() => {
    if (!isOffline && isVisible) {
      stopPolling()
      startPolling(otherUserId, pollingInterval)
    }
  }, [pollingInterval, otherUserId, isOffline, isVisible, startPolling, stopPolling])

  // Initial setup
  useEffect(() => {
    fetchMessages(otherUserId)
    markAsRead(otherUserId)
    
    if (!isOffline) {
      startPolling(otherUserId, pollingInterval)
    }

    return () => {
      stopPolling()
    }
  }, [otherUserId, fetchMessages, markAsRead, startPolling, stopPolling, pollingInterval, isOffline])

  // Handle new message notifications
  useEffect(() => {
    if (messages.length > previousMessagesLength.current) {
      // Show notification if user is not at bottom of conversation
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
        
        if (!isAtBottom && isVisible) {
          setShowNewMessageNotification(true)
        } else {
          // Auto-scroll to bottom if user is already at bottom
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    previousMessagesLength.current = messages.length
  }, [messages, isVisible])

  const handleScroll = () => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    
    // Clear new message notification when user scrolls to bottom
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setShowNewMessageNotification(false)
      markAsRead(otherUserId)
    }

    // Load more messages when scrolled to top
    if (scrollTop === 0 && messages.length > 0) {
      fetchMessages(otherUserId, { offset: messages.length, loadMore: true })
    }
  }

  const handleRefresh = () => {
    fetchMessages(otherUserId)
    if (!isOffline) {
      startPolling(otherUserId, pollingInterval)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 2880) return 'Yesterday'
    return formatTime(date)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMessageStatus = (message: Message) => {
    if (message.read_at) {
      return `Read ${formatTime(message.read_at)}`
    }
    return 'Delivered'
  }

  const handleLongPress = (messageId: string) => {
    const timeout = setTimeout(() => {
      setShowOptionsMenu(messageId)
    }, 500)
    setLongPressTimeout(timeout)
  }

  const handleMouseUp = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout)
      setLongPressTimeout(null)
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    setDeleteConfirmId(messageId)
    setShowOptionsMenu(null)
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMessage(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [date: string]: Message[] } = {}
    
    messages.forEach(message => {
      const dateKey = new Date(message.created_at).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(message)
    })
    
    return grouped
  }

  const handleRetry = () => {
    handleRefresh()
  }

  if (loading && messages.length === 0) {
    return (
      <div className="message-list-loading" data-testid="message-list-loading">
        Loading messages...
      </div>
    )
  }

  if (error) {
    const isPollingError = error.includes('Polling failed')
    
    return (
      <div className="message-list-error" data-testid={isPollingError ? 'polling-error' : 'message-list-error'}>
        <p>{isPollingError ? 'Network error' : 'Failed to load messages'}</p>
        <button onClick={handleRetry}>{isPollingError ? 'Refresh' : 'Retry'}</button>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="message-list-empty" data-testid="message-list-empty">
        <p>No messages yet</p>
        <p>Start a conversation by sending a message</p>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="message-list-wrapper">
      {/* Connection Status */}
      <div className="message-list-header">
        <div 
          className={`connection-status ${isOffline ? 'offline' : 'online'}`}
          data-testid="connection-status"
        >
          {isOffline ? 'Offline' : 'Connected'}
        </div>
        
        {/* Polling Indicator */}
        {activePollingInterval && !isOffline && (
          <div className="polling-indicator" data-testid="polling-indicator">
            <span className="live-indicator">Live</span>
          </div>
        )}
        
        {/* Offline Indicator */}
        {isOffline && (
          <div className="offline-indicator" data-testid="offline-indicator">
            You are offline
          </div>
        )}
        
        {/* Last Seen */}
        {otherUserLastSeen && (
          <div className="last-seen-indicator" data-testid="last-seen-indicator">
            Last seen {formatTime(otherUserLastSeen)}
          </div>
        )}
      </div>

      {/* New Message Notification */}
      {showNewMessageNotification && (
        <div className="new-message-notification" data-testid="new-message-notification">
          <button 
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              setShowNewMessageNotification(false)
            }}
          >
            New messages ↓
          </button>
        </div>
      )}

      {/* Typing Indicator */}
      {isOtherUserTyping && (
        <div className="typing-indicator" data-testid="typing-indicator">
          <span>User is typing...</span>
        </div>
      )}
    <div 
      className="message-list-container" 
      data-testid="message-list-container"
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div className="message-list">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            <div className="date-separator">
              {formatDate(new Date(dateKey))}
            </div>
            
            {dayMessages.map((message) => {
              const isSent = message.sender_id === currentUserId
              const isSelected = showOptionsMenu === message.id
              
              return (
                <div
                  key={message.id}
                  className={`message ${isSent ? 'sent' : 'received'} ${isSelected ? 'selected' : ''}`}
                  data-testid={isSent ? 'message-sent' : 'message-received'}
                  onMouseDown={() => handleLongPress(message.id)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="message-content">
                    {message.content}
                  </div>
                  
                  <div className="message-meta">
                    <span className="message-time">
                      {formatRelativeTime(message.created_at)}
                    </span>
                    
                    {isSent && (
                      <span 
                        className="message-status" 
                        data-testid={`message-status-${message.id}`}
                      >
                        {getMessageStatus(message)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {showOptionsMenu && (
        <div className="message-options-menu" data-testid="message-options-menu">
          <button 
            onClick={() => handleDeleteMessage(showOptionsMenu)}
            className="delete-option"
          >
            Delete message
          </button>
        </div>
      )}

      {deleteConfirmId && (
        <div className="delete-confirmation-modal">
          <div className="modal-content">
            <p>Delete this message?</p>
            <div className="modal-actions">
              <button onClick={confirmDelete}>Delete</button>
              <button onClick={() => setDeleteConfirmId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList