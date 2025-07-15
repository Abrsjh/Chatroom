import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageList from './MessageList'
import { useMessageStore } from '../stores'
import { Message } from '../types'

// Mock the store
jest.mock('../stores', () => ({
  useMessageStore: jest.fn()
}))

const mockUseMessageStore = useMessageStore as jest.MockedFunction<typeof useMessageStore>

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello there!',
    sender_id: 'user1',
    recipient_id: 'user2',
    created_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '2',
    content: 'Hi! How are you?',
    sender_id: 'user2',
    recipient_id: 'user1',
    created_at: new Date('2024-01-01T10:01:00Z')
  },
  {
    id: '3',
    content: 'I\'m doing great, thanks for asking!',
    sender_id: 'user1',
    recipient_id: 'user2',
    created_at: new Date('2024-01-01T10:02:00Z')
  }
]

describe('MessageList Component', () => {
  const mockFetchMessages = jest.fn()
  const mockMarkAsRead = jest.fn()
  const mockDeleteMessage = jest.fn()
  const mockStartPolling = jest.fn()
  const mockStopPolling = jest.fn()

  const defaultStore = {
    messages: [],
    conversations: [],
    loading: false,
    error: null,
    currentConversation: null,
    unreadCount: 0,
    fetchMessages: mockFetchMessages,
    markAsRead: mockMarkAsRead,
    deleteMessage: mockDeleteMessage,
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling,
    sendMessage: jest.fn(),
    fetchConversations: jest.fn(),
    setCurrentConversation: jest.fn(),
    clearMessages: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMessageStore.mockReturnValue(defaultStore)
  })

  test('renders empty state when no messages', () => {
    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('message-list-empty')).toBeInTheDocument()
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument()
  })

  test('renders messages in conversation', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
    expect(screen.getByText('Hi! How are you?')).toBeInTheDocument()
    expect(screen.getByText('I\'m doing great, thanks for asking!')).toBeInTheDocument()
  })

  test('displays messages with correct sender styling', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages,
      currentUserId: 'user1'
    })

    render(<MessageList otherUserId="user2" />)
    
    const sentMessages = screen.getAllByTestId(/message-sent/)
    const receivedMessages = screen.getAllByTestId(/message-received/)
    
    expect(sentMessages).toHaveLength(2) // Messages from user1
    expect(receivedMessages).toHaveLength(1) // Message from user2
  })

  test('shows message timestamps', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages
    })

    render(<MessageList otherUserId="user2" />)
    
    // Should display formatted timestamps
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
    expect(screen.getByText(/10:01/)).toBeInTheDocument()
    expect(screen.getByText(/10:02/)).toBeInTheDocument()
  })

  test('fetches messages on mount', () => {
    render(<MessageList otherUserId="user2" />)
    
    expect(mockFetchMessages).toHaveBeenCalledWith('user2')
  })

  test('starts polling on mount and stops on unmount', () => {
    const { unmount } = render(<MessageList otherUserId="user2" />)
    
    expect(mockStartPolling).toHaveBeenCalledWith('user2')
    
    unmount()
    
    expect(mockStopPolling).toHaveBeenCalled()
  })

  test('shows loading state', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      loading: true
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('message-list-loading')).toBeInTheDocument()
    expect(screen.getByText(/loading messages/i)).toBeInTheDocument()
  })

  test('shows error state with retry option', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      error: 'Failed to load messages'
    })

    render(<MessageList otherUserId="user2" />)
    
    expect(screen.getByTestId('message-list-error')).toBeInTheDocument()
    expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  test('retries loading messages when retry button clicked', async () => {
    const user = userEvent.setup()
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      error: 'Failed to load messages'
    })

    render(<MessageList otherUserId="user2" />)
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)
    
    expect(mockFetchMessages).toHaveBeenCalledWith('user2')
  })

  test('marks messages as read when scrolling to bottom', async () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages
    })

    render(<MessageList otherUserId="user2" />)
    
    // Simulate scrolling to bottom
    const messageList = screen.getByTestId('message-list-container')
    fireEvent.scroll(messageList, { target: { scrollTop: 1000, scrollHeight: 1000, clientHeight: 400 } })
    
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('user2')
    })
  })

  test('shows message options menu on long press', async () => {
    const user = userEvent.setup()
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages,
      currentUserId: 'user1'
    })

    render(<MessageList otherUserId="user2" />)
    
    const firstMessage = screen.getByText('Hello there!')
    
    // Long press (mouse down and hold)
    fireEvent.mouseDown(firstMessage)
    
    await waitFor(() => {
      expect(screen.getByTestId('message-options-menu')).toBeInTheDocument()
      expect(screen.getByText(/delete message/i)).toBeInTheDocument()
    }, { timeout: 600 })
  })

  test('deletes message when delete option selected', async () => {
    const user = userEvent.setup()
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages,
      currentUserId: 'user1'
    })

    render(<MessageList otherUserId="user2" />)
    
    const firstMessage = screen.getByText('Hello there!')
    
    // Long press to show options
    fireEvent.mouseDown(firstMessage)
    
    await waitFor(() => {
      expect(screen.getByTestId('message-options-menu')).toBeInTheDocument()
    })
    
    const deleteButton = screen.getByText(/delete message/i)
    await user.click(deleteButton)
    
    // Should show confirmation
    expect(screen.getByText(/delete this message/i)).toBeInTheDocument()
    
    const confirmButton = screen.getByRole('button', { name: /delete/i })
    await user.click(confirmButton)
    
    expect(mockDeleteMessage).toHaveBeenCalledWith('1')
  })

  test('auto-scrolls to bottom when new message arrives', async () => {
    const { rerender } = render(<MessageList otherUserId="user2" />)
    
    // Mock scrollIntoView
    const mockScrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView
    
    // Add new message
    const newMessages = [...mockMessages, {
      id: '4',
      content: 'New message',
      sender_id: 'user2',
      recipient_id: 'user1',
      created_at: new Date()
    }]
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: newMessages
    })
    
    rerender(<MessageList otherUserId="user2" />)
    
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled()
    })
  })

  test('shows read receipts for sent messages', () => {
    const messagesWithReadStatus = mockMessages.map(msg => ({
      ...msg,
      read_at: msg.sender_id === 'user1' ? new Date('2024-01-01T10:05:00Z') : undefined
    }))
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: messagesWithReadStatus,
      currentUserId: 'user1'
    })

    render(<MessageList otherUserId="user2" />)
    
    // Should show read indicators for sent messages
    const readIndicators = screen.getAllByTestId('message-read-indicator')
    expect(readIndicators).toHaveLength(2) // Only for sent messages
  })

  test('groups messages by date', () => {
    const messagesAcrossDays = [
      {
        id: '1',
        content: 'Yesterday message',
        sender_id: 'user1',
        recipient_id: 'user2',
        created_at: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: '2',
        content: 'Today message',
        sender_id: 'user2',
        recipient_id: 'user1',
        created_at: new Date('2024-01-02T10:00:00Z')
      }
    ]
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: messagesAcrossDays
    })

    render(<MessageList otherUserId="user2" />)
    
    // Should show date separators
    expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/January 2, 2024/)).toBeInTheDocument()
  })

  test('handles pagination when scrolling to top', async () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      messages: mockMessages,
      hasMoreMessages: true
    })

    render(<MessageList otherUserId="user2" />)
    
    const messageList = screen.getByTestId('message-list-container')
    
    // Simulate scrolling to top
    fireEvent.scroll(messageList, { target: { scrollTop: 0 } })
    
    await waitFor(() => {
      expect(mockFetchMessages).toHaveBeenCalledWith('user2', { 
        offset: mockMessages.length, 
        loadMore: true 
      })
    })
  })
})