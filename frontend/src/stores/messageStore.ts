import { create } from 'zustand'
import { Message, Conversation } from '../types'
import * as api from '../services/api'

interface MessageState {
  messages: Message[]
  conversations: Conversation[]
  loading: boolean
  error: string | null
  currentConversation: string | null
  unreadCount: number
  isOtherUserTyping: boolean
  isOffline: boolean
  pollingInterval: NodeJS.Timeout | null
  
  // Actions
  setMessages: (messages: Message[]) => void
  setConversations: (conversations: Conversation[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCurrentConversation: (userId: string | null) => void
  clearMessages: () => void
  
  // API Actions
  fetchMessages: (otherUserId: string, options?: { offset?: number; limit?: number; loadMore?: boolean }) => Promise<void>
  sendMessage: (otherUserId: string, content: string) => Promise<Message>
  fetchConversations: () => Promise<void>
  markAsRead: (otherUserId: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  
  // Real-time polling
  startPolling: (otherUserId: string, interval?: number) => void
  stopPolling: () => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  conversations: [],
  loading: false,
  error: null,
  currentConversation: null,
  unreadCount: 0,
  isOtherUserTyping: false,
  isOffline: false,
  pollingInterval: null,
  
  setMessages: (messages: Message[]) => {
    set({ messages })
  },
  
  setConversations: (conversations: Conversation[]) => {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0)
    set({ conversations, unreadCount: totalUnread })
  },
  
  setLoading: (loading: boolean) => {
    set({ loading })
  },
  
  setError: (error: string | null) => {
    set({ error })
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  setCurrentConversation: (userId: string | null) => {
    set({ currentConversation: userId })
  },
  
  clearMessages: () => {
    set({ messages: [], currentConversation: null })
  },
  
  fetchMessages: async (otherUserId: string, options = {}) => {
    const { offset = 0, limit = 50, loadMore = false } = options
    
    set({ loading: true, error: null })
    
    try {
      const messages = await api.getConversation(otherUserId, { skip: offset, limit })
      
      if (loadMore) {
        // Prepend older messages (they come in chronological order)
        set((state) => ({
          messages: [...messages, ...state.messages],
          loading: false
        }))
      } else {
        set({ messages, loading: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages'
      set({ error: errorMessage, loading: false })
    }
  },
  
  sendMessage: async (otherUserId: string, content: string) => {
    set({ loading: true, error: null })
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      sender_id: 'current-user', // This would be actual current user ID
      recipient_id: otherUserId,
      created_at: new Date()
    }
    
    set((state) => ({
      messages: [...state.messages, optimisticMessage]
    }))
    
    try {
      const sentMessage = await api.sendMessage(otherUserId, content)
      
      // Replace optimistic message with real one
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === tempId ? sentMessage : msg
        ),
        loading: false
      }))
      
      return sentMessage
    } catch (error) {
      // Remove optimistic message on error
      set((state) => ({
        messages: state.messages.filter(msg => msg.id !== tempId),
        error: error instanceof Error ? error.message : 'Failed to send message',
        loading: false
      }))
      throw error
    }
  },
  
  fetchConversations: async () => {
    set({ loading: true, error: null })
    
    try {
      const conversations = await api.getConversations()
      get().setConversations(conversations)
      set({ loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversations'
      set({ error: errorMessage, loading: false })
    }
  },
  
  markAsRead: async (otherUserId: string) => {
    try {
      await api.markAsRead(otherUserId)
      
      // Update conversations to reflect read status
      set((state) => {
        const updatedConversations = state.conversations.map(conv =>
          conv.other_user_id === otherUserId
            ? { ...conv, unread_count: 0 }
            : conv
        )
        const totalUnread = updatedConversations.reduce((sum, conv) => sum + conv.unread_count, 0)
        
        return {
          conversations: updatedConversations,
          unreadCount: totalUnread
        }
      })
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  },
  
  deleteMessage: async (messageId: string) => {
    try {
      await api.deleteMessage(messageId)
      
      // Remove message from store
      set((state) => ({
        messages: state.messages.filter(msg => msg.id !== messageId)
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message'
      set({ error: errorMessage })
      throw error
    }
  },
  
  startPolling: (otherUserId: string, interval = 5000) => {
    // Clear existing polling
    const { pollingInterval } = get()
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    // Start new polling
    const newInterval = setInterval(async () => {
      try {
        const currentMessages = get().messages
        const messages = await api.getConversation(otherUserId, { 
          skip: 0, 
          limit: 50 
        })
        
        // Only update if there are new messages
        if (messages.length > currentMessages.length) {
          set({ messages })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, interval)
    
    set({ pollingInterval: newInterval })
  },
  
  stopPolling: () => {
    const { pollingInterval } = get()
    if (pollingInterval) {
      clearInterval(pollingInterval)
      set({ pollingInterval: null })
    }
  }
})