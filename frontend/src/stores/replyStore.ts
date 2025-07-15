import { create } from 'zustand'
import { Reply } from '../types'
import * as api from '../services/api'

interface ReplyState {
  replies: Reply[]
  loading: boolean
  error: string | null
  currentPostId: string | null
  expandedThreads: Set<string>
  replyingTo: string | null
  editingReply: string | null
  maxThreadDepth: number
  performanceMode: boolean
  visibleReplies: Set<string>
  
  // Actions
  setReplies: (replies: Reply[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCurrentPostId: (postId: string | null) => void
  setReplyingTo: (replyId: string | null) => void
  setEditingReply: (replyId: string | null) => void
  setMaxThreadDepth: (depth: number) => void
  setPerformanceMode: (enabled: boolean) => void
  updateVisibleReplies: () => void
  
  // Thread expansion with performance optimization
  toggleThread: (replyId: string) => void
  expandThread: (replyId: string) => void
  collapseThread: (replyId: string) => void
  expandAllThreads: () => void
  collapseAllThreads: () => void
  isThreadExpanded: (replyId: string) => boolean
  getThreadDepth: (replyId: string) => number
  shouldLimitThread: (replyId: string) => boolean
  
  // API Actions
  fetchReplies: (postId: string, threaded?: boolean) => Promise<void>
  createReply: (postId: string, content: string, parentId?: string) => Promise<Reply>
  updateReply: (replyId: string, content: string) => Promise<Reply>
  deleteReply: (replyId: string) => Promise<void>
  
  // Utility functions
  getRepliesByParent: (parentId?: string) => Reply[]
  getReplyById: (replyId: string) => Reply | undefined
  getReplyChildren: (replyId: string) => Reply[]
  clearReplies: () => void
}

export const useReplyStore = create<ReplyState>((set, get) => ({
  replies: [],
  loading: false,
  error: null,
  currentPostId: null,
  expandedThreads: new Set<string>(),
  replyingTo: null,
  editingReply: null,
  maxThreadDepth: 10,
  performanceMode: false,
  visibleReplies: new Set<string>(),
  
  setReplies: (replies: Reply[]) => {
    set({ replies })
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
  
  setCurrentPostId: (postId: string | null) => {
    set({ currentPostId: postId })
  },
  
  setReplyingTo: (replyId: string | null) => {
    set({ replyingTo: replyId })
  },
  
  setEditingReply: (replyId: string | null) => {
    set({ editingReply: replyId })
  },
  
  setMaxThreadDepth: (depth: number) => {
    set({ maxThreadDepth: depth })
    get().updateVisibleReplies()
  },
  
  setPerformanceMode: (enabled: boolean) => {
    set({ performanceMode: enabled })
    get().updateVisibleReplies()
  },
  
  updateVisibleReplies: () => {
    const { replies, expandedThreads, performanceMode, maxThreadDepth } = get()
    const visible = new Set<string>()
    
    // Calculate visible replies based on expanded threads and performance settings
    const processReply = (reply: Reply) => {
      visible.add(reply.id)
      
      if (expandedThreads.has(reply.id) && reply.depth < maxThreadDepth) {
        const children = replies.filter(r => r.parent_id === reply.id)
        
        // In performance mode, limit visible children
        const maxChildren = performanceMode ? 50 : Infinity
        children.slice(0, maxChildren).forEach(processReply)
      }
    }
    
    // Start with root replies
    replies.filter(r => !r.parent_id).forEach(processReply)
    
    set({ visibleReplies: visible })
  },
  
  toggleThread: (replyId: string) => {
    const { expandedThreads } = get()
    const newExpandedThreads = new Set(expandedThreads)
    
    if (newExpandedThreads.has(replyId)) {
      newExpandedThreads.delete(replyId)
    } else {
      newExpandedThreads.add(replyId)
    }
    
    set({ expandedThreads: newExpandedThreads })
  },
  
  expandThread: (replyId: string) => {
    const { expandedThreads } = get()
    const newExpandedThreads = new Set(expandedThreads)
    newExpandedThreads.add(replyId)
    set({ expandedThreads: newExpandedThreads })
  },
  
  collapseThread: (replyId: string) => {
    const { expandedThreads, replies } = get()
    const newExpandedThreads = new Set(expandedThreads)
    
    // Remove this thread and recursively collapse children
    newExpandedThreads.delete(replyId)
    const collapseChildren = (parentId: string) => {
      replies.filter(r => r.parent_id === parentId).forEach(child => {
        newExpandedThreads.delete(child.id)
        collapseChildren(child.id)
      })
    }
    collapseChildren(replyId)
    
    set({ expandedThreads: newExpandedThreads })
    get().updateVisibleReplies()
  },
  
  expandAllThreads: () => {
    const { replies, maxThreadDepth } = get()
    const newExpandedThreads = new Set<string>()
    
    replies.forEach(reply => {
      if (reply.depth < maxThreadDepth) {
        const children = replies.filter(r => r.parent_id === reply.id)
        if (children.length > 0) {
          newExpandedThreads.add(reply.id)
        }
      }
    })
    
    set({ expandedThreads: newExpandedThreads })
    get().updateVisibleReplies()
  },
  
  collapseAllThreads: () => {
    set({ expandedThreads: new Set<string>() })
    get().updateVisibleReplies()
  },
  
  isThreadExpanded: (replyId: string) => {
    const { expandedThreads } = get()
    return expandedThreads.has(replyId)
  },
  
  getThreadDepth: (replyId: string) => {
    const reply = get().replies.find(r => r.id === replyId)
    return reply?.depth ?? 0
  },
  
  shouldLimitThread: (replyId: string) => {
    const { maxThreadDepth } = get()
    const depth = get().getThreadDepth(replyId)
    return depth >= maxThreadDepth
  },
  
  fetchReplies: async (postId: string, threaded = true) => {
    set({ loading: true, error: null, currentPostId: postId })
    
    try {
      const replies = await api.getPostReplies(postId, { threaded })
      set({ replies, loading: false })
      
      // Update performance mode based on reply count
      const performanceMode = replies.length > 100
      set({ performanceMode })
      
      // Initialize visible replies
      get().updateVisibleReplies()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch replies'
      set({ error: errorMessage, loading: false })
    }
  },
  
  createReply: async (postId: string, content: string, parentId?: string) => {
    set({ loading: true, error: null })
    
    try {
      const newReply = await api.createReply(postId, { content, parentId })
      
      // Add the new reply to the store
      set((state) => ({
        replies: [...state.replies, newReply],
        loading: false,
        replyingTo: null // Clear the replying state
      }))
      
      return newReply
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reply'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },
  
  updateReply: async (replyId: string, content: string) => {
    set({ loading: true, error: null })
    
    try {
      const updatedReply = await api.updateReply(replyId, { content })
      
      // Update the reply in the store
      set((state) => ({
        replies: state.replies.map(reply => 
          reply.id === replyId ? updatedReply : reply
        ),
        loading: false,
        editingReply: null // Clear the editing state
      }))
      
      return updatedReply
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reply'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },
  
  deleteReply: async (replyId: string) => {
    set({ loading: true, error: null })
    
    try {
      await api.deleteReply(replyId)
      
      // Remove the reply from the store
      set((state) => ({
        replies: state.replies.filter(reply => reply.id !== replyId),
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reply'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },
  
  getRepliesByParent: (parentId?: string) => {
    const { replies } = get()
    return replies.filter(reply => reply.parent_id === parentId)
  },
  
  getReplyById: (replyId: string) => {
    const { replies } = get()
    return replies.find(reply => reply.id === replyId)
  },
  
  getReplyChildren: (replyId: string) => {
    const { replies } = get()
    return replies.filter(reply => reply.parent_id === replyId)
  },
  
  clearReplies: () => {
    set({ 
      replies: [], 
      currentPostId: null, 
      expandedThreads: new Set(), 
      replyingTo: null,
      editingReply: null 
    })
  }
}))