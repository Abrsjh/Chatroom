import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageCreate from './MessageCreate'
import { useMessageStore } from '../stores'
import { Message } from '../types'

// Mock the store
jest.mock('../stores', () => ({
  useMessageStore: jest.fn()
}))

const mockUseMessageStore = useMessageStore as jest.MockedFunction<typeof useMessageStore>

describe('MessageCreate Component', () => {
  const mockSendMessage = jest.fn()
  const mockClearError = jest.fn()

  const defaultStore = {
    messages: [],
    conversations: [],
    loading: false,
    error: null,
    currentConversation: null,
    unreadCount: 0,
    sendMessage: mockSendMessage,
    clearError: mockClearError,
    fetchMessages: jest.fn(),
    markAsRead: jest.fn(),
    deleteMessage: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    fetchConversations: jest.fn(),
    setCurrentConversation: jest.fn(),
    clearMessages: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMessageStore.mockReturnValue(defaultStore)
  })

  test('renders message input form', () => {
    render(<MessageCreate otherUserId="user2" />)
    
    expect(screen.getByRole('textbox', { name: /type a message/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  test('allows typing in message input', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    await user.type(input, 'Hello world!')
    
    expect(input).toHaveValue('Hello world!')
  })

  test('sends message on form submission', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    expect(mockSendMessage).toHaveBeenCalledWith('user2', 'Test message')
  })

  test('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    
    await user.type(input, 'Test message{enter}')
    
    expect(mockSendMessage).toHaveBeenCalledWith('user2', 'Test message')
  })

  test('does not send on Shift+Enter (creates new line)', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    
    await user.type(input, 'Line 1{shift}{enter}Line 2')
    
    expect(input).toHaveValue('Line 1\nLine 2')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  test('clears input after successful send', async () => {
    const user = userEvent.setup()
    
    // Mock successful send
    mockSendMessage.mockResolvedValueOnce({
      id: '1',
      content: 'Test message',
      sender_id: 'user1',
      recipient_id: 'user2',
      created_at: new Date()
    })
    
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  test('prevents sending empty messages', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Button should be disabled when input is empty
    expect(sendButton).toBeDisabled()
    
    await user.click(sendButton)
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  test('prevents sending messages with only whitespace', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, '   ')
    
    expect(sendButton).toBeDisabled()
  })

  test('shows character count', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    
    await user.type(input, 'Hello')
    
    expect(screen.getByText('5/2000')).toBeInTheDocument()
  })

  test('prevents sending messages over character limit', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const longMessage = 'a'.repeat(2001)
    
    await user.type(input, longMessage)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
    
    expect(screen.getByText(/2001\/2000/)).toBeInTheDocument()
    expect(screen.getByText(/message too long/i)).toBeInTheDocument()
  })

  test('shows loading state while sending', async () => {
    const user = userEvent.setup()
    
    // Mock sending with delay
    let resolveSend: (value: any) => void
    mockSendMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSend = resolve
      })
    )
    
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
    
    // Resolve the promise
    resolveSend!({
      id: '1',
      content: 'Test message',
      sender_id: 'user1',
      recipient_id: 'user2',
      created_at: new Date()
    })
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })
  })

  test('shows error state when send fails', async () => {
    const user = userEvent.setup()
    
    mockSendMessage.mockRejectedValueOnce(new Error('Failed to send message'))
    
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('message-create-error')).toBeInTheDocument()
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
    })
    
    // Input should retain the message content
    expect(input).toHaveValue('Test message')
    
    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('retries sending when retry button clicked', async () => {
    const user = userEvent.setup()
    
    // First attempt fails
    mockSendMessage.mockRejectedValueOnce(new Error('Network error'))
    // Second attempt succeeds
    mockSendMessage.mockResolvedValueOnce({
      id: '1',
      content: 'Test message',
      sender_id: 'user1',
      recipient_id: 'user2',
      created_at: new Date()
    })
    
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    // Wait for error
    await waitFor(() => {
      expect(screen.getByTestId('message-create-error')).toBeInTheDocument()
    })
    
    // Click retry
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)
    
    expect(mockSendMessage).toHaveBeenCalledTimes(2)
    expect(mockSendMessage).toHaveBeenLastCalledWith('user2', 'Test message')
  })

  test('clears error when user starts typing', async () => {
    const user = userEvent.setup()
    
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      error: 'Failed to send message'
    })
    
    render(<MessageCreate otherUserId="user2" />)
    
    expect(screen.getByTestId('message-create-error')).toBeInTheDocument()
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    await user.type(input, 'New message')
    
    expect(mockClearError).toHaveBeenCalled()
  })

  test('auto-resizes textarea based on content', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    
    // Initially should have minimum height
    expect(textarea).toHaveStyle({ height: expect.stringMatching(/40px|auto/) })
    
    // Type multiple lines
    await user.type(textarea, 'Line 1{shift}{enter}Line 2{shift}{enter}Line 3{shift}{enter}Line 4')
    
    // Height should increase (we can't easily test exact values, but check it's not the minimum)
    expect(textarea.scrollHeight).toBeGreaterThan(40)
  })

  test('shows typing indicator for received messages', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      isOtherUserTyping: true
    })
    
    render(<MessageCreate otherUserId="user2" />)
    
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    expect(screen.getByText(/is typing/i)).toBeInTheDocument()
  })

  test('supports file attachment (placeholder test)', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    // Should have attachment button (even if not fully implemented)
    const attachButton = screen.getByRole('button', { name: /attach file/i })
    expect(attachButton).toBeInTheDocument()
    
    await user.click(attachButton)
    
    // Should open file picker (mocked)
    expect(screen.getByTestId('file-picker')).toBeInTheDocument()
  })

  test('disables form when user is offline', () => {
    mockUseMessageStore.mockReturnValue({
      ...defaultStore,
      isOffline: true
    })
    
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()
    
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
  })

  test('shows draft save indicator', async () => {
    const user = userEvent.setup()
    render(<MessageCreate otherUserId="user2" />)
    
    const input = screen.getByRole('textbox', { name: /type a message/i })
    
    await user.type(input, 'Draft message')
    
    // Should show draft saved indicator after a delay
    await waitFor(() => {
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})