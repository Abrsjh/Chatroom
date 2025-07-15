import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MessageList } from './MessageList'
import { useMessageStore } from '../stores/messageStore'
import { Message } from '../types'

// Mock the message store
jest.mock('../stores/messageStore')

const mockUseMessageStore = useMessageStore as jest.MockedFunction<typeof useMessageStore>

describe('MessageList Polling Enhancements', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Initial message',
      sender_id: 'user1',
      recipient_id: 'user2',
      created_at: new Date('2024-01-01T10:00:00Z')
    }
  ]

  const mockStore = {
    messages: mockMessages,
    loading: false,
    error: null,
    currentConversation: 'user2',
    pollingInterval: null,
    isOtherUserTyping: false,
    isOffline: false,
    fetchMessages: jest.fn(),
    markAsRead: jest.fn(),
    deleteMessage: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    sendMessage: jest.fn(),
    fetchConversations: jest.fn(),
    setCurrentConversation: jest.fn(),
    clearMessages: jest.fn()
  }

  beforeEach(() => {
    mockUseMessageStore.mockReturnValue(mockStore)
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts polling with configurable interval', () => {
    render(<MessageList otherUserId="user2" pollingInterval={3000} />)
    
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 3000)
  })

  it('uses default polling interval when not specified', () => {
    render(<MessageList otherUserId="user2" />)
    
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 5000)
  })

  it('shows visual indicator when polling is active', () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      pollingInterval: 123 // Non-null indicates active polling
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('polling-indicator')).toBeInTheDocument()
    expect(screen.getByText(/live/i)).toBeInTheDocument()
  })

  it('hides polling indicator when polling is stopped', () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      pollingInterval: null
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.queryByTestId('polling-indicator')).not.toBeInTheDocument()
  })

  it('shows offline indicator when user is offline', () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOffline: true
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('pauses polling when user is offline', () => {
    const { rerender } = render(<MessageList otherUserId="user2" />)
    
    // User goes offline
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOffline: true
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    expect(mockStore.stopPolling).toHaveBeenCalled()
  })

  it('resumes polling when user comes back online', () => {
    const { rerender } = render(<MessageList otherUserId="user2" />)
    
    // User goes offline
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOffline: true
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    // User comes back online
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOffline: false
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    expect(mockStore.startPolling).toHaveBeenCalledTimes(2) // Initial + resume
  })

  it('shows typing indicator when other user is typing', () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOtherUserTyping: true
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    expect(screen.getByText(/typing/i)).toBeInTheDocument()
  })

  it('shows new message notification when messages arrive', async () => {
    const { rerender } = render(<MessageList otherUserId="user2" />)
    
    // Simulate new message arriving
    const newMessage: Message = {
      id: '2',
      content: 'New message',
      sender_id: 'user2',
      recipient_id: 'user1',
      created_at: new Date('2024-01-01T10:05:00Z')
    }
    
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      messages: [...mockMessages, newMessage]
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('new-message-notification')).toBeInTheDocument()
    })
  })

  it('clears new message notification when user scrolls to bottom', async () => {
    const { rerender } = render(<MessageList otherUserId="user2" />)
    
    // Add new message
    const newMessage: Message = {
      id: '2',
      content: 'New message',
      sender_id: 'user2',
      recipient_id: 'user1',
      created_at: new Date('2024-01-01T10:05:00Z')
    }
    
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      messages: [...mockMessages, newMessage]
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    // Notification should appear
    await waitFor(() => {
      expect(screen.getByTestId('new-message-notification')).toBeInTheDocument()
    })
    
    // Scroll to bottom
    const messageContainer = screen.getByTestId('message-list-container')
    fireEvent.scroll(messageContainer, { 
      target: { scrollTop: 1000, scrollHeight: 1000, clientHeight: 400 } 
    })
    
    await waitFor(() => {
      expect(screen.queryByTestId('new-message-notification')).not.toBeInTheDocument()
    })
  })

  it('shows polling error when polling fails', async () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      error: 'Polling failed: Network error'
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('polling-error')).toBeInTheDocument()
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
  })

  it('allows manual refresh when polling fails', async () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      error: 'Polling failed: Network error'
    })

    render(<MessageList otherUserId="user2" />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    expect(mockStore.fetchMessages).toHaveBeenCalledWith('user2')
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 5000)
  })

  it('reduces polling frequency when tab is not visible', () => {
    render(<MessageList otherUserId="user2" />)
    
    // Simulate tab becoming hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true
    })
    
    fireEvent(document, new Event('visibilitychange'))
    
    expect(mockStore.stopPolling).toHaveBeenCalled()
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 30000) // Reduced frequency
  })

  it('restores normal polling frequency when tab becomes visible', () => {
    render(<MessageList otherUserId="user2" />)
    
    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true
    })
    
    fireEvent(document, new Event('visibilitychange'))
    
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 5000) // Normal frequency
  })

  it('shows connection status indicator', () => {
    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      isOffline: false,
      pollingInterval: 123
    })

    render(<MessageList otherUserId="user2" />)
    
    const connectionStatus = screen.getByTestId('connection-status')
    expect(connectionStatus).toHaveClass('online')
    expect(connectionStatus).toHaveTextContent('Connected')
  })

  it('shows last seen timestamp for other user', () => {
    const lastSeenTime = new Date('2024-01-01T09:55:00Z')
    
    render(<MessageList otherUserId="user2" otherUserLastSeen={lastSeenTime} />)
    
    expect(screen.getByTestId('last-seen-indicator')).toBeInTheDocument()
    expect(screen.getByText(/last seen/i)).toBeInTheDocument()
    expect(screen.getByText(/9:55 AM/i)).toBeInTheDocument()
  })

  it('shows message delivery status with timestamps', () => {
    const messageWithStatus: Message = {
      id: '1',
      content: 'Test message',
      sender_id: 'user1',
      recipient_id: 'user2',
      created_at: new Date('2024-01-01T10:00:00Z'),
      read_at: new Date('2024-01-01T10:01:00Z')
    }

    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      messages: [messageWithStatus]
    })

    render(<MessageList otherUserId="user2" />)
    
    const statusIndicator = screen.getByTestId('message-status-1')
    expect(statusIndicator).toHaveTextContent('Read 10:01 AM')
  })

  it('groups messages by relative time periods', () => {
    const now = new Date('2024-01-01T15:00:00Z')
    jest.setSystemTime(now)
    
    const messagesWithTime: Message[] = [
      {
        id: '1',
        content: 'Just now',
        sender_id: 'user1',
        recipient_id: 'user2',
        created_at: new Date('2024-01-01T14:59:00Z') // 1 minute ago
      },
      {
        id: '2',
        content: 'Earlier today',
        sender_id: 'user2',
        recipient_id: 'user1',
        created_at: new Date('2024-01-01T12:00:00Z') // 3 hours ago
      },
      {
        id: '3',
        content: 'Yesterday',
        sender_id: 'user1',
        recipient_id: 'user2',
        created_at: new Date('2023-12-31T15:00:00Z') // Yesterday
      }
    ]

    mockUseMessageStore.mockReturnValue({
      ...mockStore,
      messages: messagesWithTime
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByText('Just now')).toBeInTheDocument()
    expect(screen.getByText('Earlier today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('handles polling interval changes dynamically', () => {
    const { rerender } = render(<MessageList otherUserId="user2" pollingInterval={5000} />)
    
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 5000)
    
    // Change interval
    rerender(<MessageList otherUserId="user2" pollingInterval={3000} />)
    
    expect(mockStore.stopPolling).toHaveBeenCalled()
    expect(mockStore.startPolling).toHaveBeenCalledWith('user2', 3000)
  })
})