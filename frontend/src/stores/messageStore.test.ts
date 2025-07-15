import { act, renderHook, waitFor } from '@testing-library/react'
import { useMessageStore } from './messageStore'
import { Message, Conversation } from '../types'
import * as api from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockApi = api as jest.Mocked<typeof api>

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello!',
    sender_id: 'user1',
    recipient_id: 'user2',
    created_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '2',
    content: 'Hi there!',
    sender_id: 'user2',
    recipient_id: 'user1',
    created_at: new Date('2024-01-01T10:01:00Z')
  }
]

const mockConversations: Conversation[] = [
  {
    other_user_id: 'user2',
    other_username: 'alice',
    latest_message: {
      id: '2',
      content: 'Hi there!',
      sender_id: 'user2',
      created_at: new Date('2024-01-01T10:01:00Z')
    },
    unread_count: 1
  }
]

describe('Message Store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { result } = renderHook(() => useMessageStore())
    act(() => {
      result.current.clearMessages()
    })
  })

  describe('Initial State', () => {
    test('has correct initial state', () => {
      const { result } = renderHook(() => useMessageStore())
      
      expect(result.current.messages).toEqual([])
      expect(result.current.conversations).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.currentConversation).toBeNull()
      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('Fetch Messages', () => {
    test('fetchMessages updates store on success', async () => {
      mockApi.getConversation.mockResolvedValueOnce(mockMessages)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.fetchMessages('user2')
      })
      
      expect(mockApi.getConversation).toHaveBeenCalledWith('user2', { skip: 0, limit: 50 })
      expect(result.current.messages).toEqual(mockMessages)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('fetchMessages sets loading state during call', async () => {
      let resolvePromise: (value: Message[]) => void
      const apiPromise = new Promise<Message[]>((resolve) => {
        resolvePromise = resolve
      })
      mockApi.getConversation.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.fetchMessages('user2')
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockMessages)
        await apiPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    test('fetchMessages handles errors', async () => {
      const errorMessage = 'Failed to fetch messages'
      mockApi.getConversation.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.fetchMessages('user2')
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
      expect(result.current.messages).toEqual([])
    })

    test('fetchMessages supports pagination (load more)', async () => {
      const initialMessages = [mockMessages[0]]
      const additionalMessages = [mockMessages[1]]
      
      mockApi.getConversation
        .mockResolvedValueOnce(initialMessages)
        .mockResolvedValueOnce(additionalMessages)
      
      const { result } = renderHook(() => useMessageStore())
      
      // Initial load
      await act(async () => {
        await result.current.fetchMessages('user2')
      })
      
      expect(result.current.messages).toEqual(initialMessages)
      
      // Load more
      await act(async () => {
        await result.current.fetchMessages('user2', { offset: 1, loadMore: true })
      })
      
      expect(result.current.messages).toEqual([...additionalMessages, ...initialMessages])
    })
  })

  describe('Send Message', () => {
    test('sendMessage creates message and updates store', async () => {
      const newMessage: Message = {
        id: '3',
        content: 'New message',
        sender_id: 'user1',
        recipient_id: 'user2',
        created_at: new Date()
      }
      
      mockApi.sendMessage.mockResolvedValueOnce(newMessage)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.sendMessage('user2', 'New message')
      })
      
      expect(mockApi.sendMessage).toHaveBeenCalledWith('user2', 'New message')
      expect(result.current.messages).toContainEqual(newMessage)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('sendMessage handles errors', async () => {
      const errorMessage = 'Failed to send message'
      mockApi.sendMessage.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        try {
          await result.current.sendMessage('user2', 'Test message')
        } catch (error) {
          // Expected to throw
        }
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
    })

    test('sendMessage adds optimistic update', async () => {
      // Simulate slow API response
      let resolveApi: (value: Message) => void
      const apiPromise = new Promise<Message>((resolve) => {
        resolveApi = resolve
      })
      mockApi.sendMessage.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.sendMessage('user2', 'Test message')
      })
      
      // Should have optimistic message
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Test message')
      expect(result.current.messages[0].id).toMatch(/temp-/)
      
      // Resolve API call
      const actualMessage: Message = {
        id: '3',
        content: 'Test message',
        sender_id: 'user1',
        recipient_id: 'user2',
        created_at: new Date()
      }
      
      await act(async () => {
        resolveApi!(actualMessage)
        await apiPromise
      })
      
      // Should replace optimistic message with real one
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].id).toBe('3')
    })
  })

  describe('Fetch Conversations', () => {
    test('fetchConversations updates store', async () => {
      mockApi.getConversations.mockResolvedValueOnce(mockConversations)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.fetchConversations()
      })
      
      expect(result.current.conversations).toEqual(mockConversations)
      expect(result.current.unreadCount).toBe(1) // Sum of unread counts
    })

    test('fetchConversations handles errors', async () => {
      const errorMessage = 'Failed to fetch conversations'
      mockApi.getConversations.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.fetchConversations()
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.conversations).toEqual([])
    })
  })

  describe('Mark as Read', () => {
    test('markAsRead calls API and updates unread count', async () => {
      mockApi.markAsRead.mockResolvedValueOnce({ marked_as_read: 2 })
      
      const { result } = renderHook(() => useMessageStore())
      
      // Set initial state with unread messages
      act(() => {
        result.current.setConversations(mockConversations)
      })
      
      await act(async () => {
        await result.current.markAsRead('user2')
      })
      
      expect(mockApi.markAsRead).toHaveBeenCalledWith('user2')
      
      // Should update conversation unread count
      expect(result.current.conversations[0].unread_count).toBe(0)
      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('Delete Message', () => {
    test('deleteMessage calls API and removes from store', async () => {
      mockApi.deleteMessage.mockResolvedValueOnce({ message: 'Deleted' })
      
      const { result } = renderHook(() => useMessageStore())
      
      // Set initial messages
      act(() => {
        result.current.setMessages(mockMessages)
      })
      
      await act(async () => {
        await result.current.deleteMessage('1')
      })
      
      expect(mockApi.deleteMessage).toHaveBeenCalledWith('1')
      
      // Should remove message from store
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].id).toBe('2')
    })
  })

  describe('Real-time Polling', () => {
    test('startPolling begins polling for new messages', async () => {
      jest.useFakeTimers()
      
      mockApi.getConversation.mockResolvedValue(mockMessages)
      
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.startPolling('user2')
      })
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000) // 5 seconds
      })
      
      await waitFor(() => {
        expect(mockApi.getConversation).toHaveBeenCalled()
      })
      
      jest.useRealTimers()
    })

    test('stopPolling stops the polling', () => {
      jest.useFakeTimers()
      
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.startPolling('user2')
        result.current.stopPolling()
      })
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000)
      })
      
      // Should not have called API after stopping
      expect(mockApi.getConversation).not.toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    test('polling detects new messages and updates store', async () => {
      jest.useFakeTimers()
      
      const newMessage: Message = {
        id: '3',
        content: 'New incoming message',
        sender_id: 'user2',
        recipient_id: 'user1',
        created_at: new Date()
      }
      
      mockApi.getConversation
        .mockResolvedValueOnce(mockMessages)
        .mockResolvedValueOnce([...mockMessages, newMessage])
      
      const { result } = renderHook(() => useMessageStore())
      
      // Start with initial messages
      await act(async () => {
        await result.current.fetchMessages('user2')
      })
      
      expect(result.current.messages).toHaveLength(2)
      
      // Start polling
      act(() => {
        result.current.startPolling('user2')
      })
      
      // Fast-forward time to trigger poll
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3)
        expect(result.current.messages[2]).toEqual(newMessage)
      })
      
      jest.useRealTimers()
    })
  })

  describe('Current Conversation', () => {
    test('setCurrentConversation updates current conversation', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.setCurrentConversation('user2')
      })
      
      expect(result.current.currentConversation).toBe('user2')
    })

    test('clearMessages resets messages and current conversation', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.setMessages(mockMessages)
        result.current.setCurrentConversation('user2')
        result.current.clearMessages()
      })
      
      expect(result.current.messages).toEqual([])
      expect(result.current.currentConversation).toBeNull()
    })
  })

  describe('Error Handling', () => {
    test('clearError resets error state', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBeNull()
    })
  })
})