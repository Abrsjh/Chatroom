import { create } from 'zustand'
import { Vote, VoteCounts, VoteType, VoteCreateData, VoteResponse, VoteRemovalResponse } from '../types'
import * as api from '../services/api'

interface VoteState {
  // Vote data
  userVotes: Map<string, Vote>  // key: targetType:targetId:userId
  voteCounts: Map<string, VoteCounts>  // key: targetType:targetId
  
  // UI state
  loading: boolean
  error: string | null
  
  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Vote operations
  voteOnPost: (postId: string, voteType: VoteType, userId: string) => Promise<VoteResponse | VoteRemovalResponse>
  voteOnReply: (replyId: string, voteType: VoteType, userId: string) => Promise<VoteResponse | VoteRemovalResponse>
  
  // Vote queries
  getUserVote: (targetType: 'post' | 'reply', targetId: string, userId: string) => Vote | null
  getVoteCounts: (targetType: 'post' | 'reply', targetId: string) => VoteCounts | undefined
  
  // Data fetching
  refreshVoteCounts: (targetType: 'post' | 'reply', targetId: string) => Promise<void>
  refreshUserVote: (targetType: 'post' | 'reply', targetId: string, userId: string) => Promise<void>
  
  // Bulk operations
  refreshMultipleVoteCounts: (targets: Array<{type: 'post' | 'reply', id: string}>) => Promise<void>
  
  // Cleanup
  clearVoteData: () => void
  clearVoteDataForTarget: (targetType: 'post' | 'reply', targetId: string) => void
}

export const useVoteStore = create<VoteState>((set, get) => ({
  // Initial state
  userVotes: new Map(),
  voteCounts: new Map(),
  loading: false,
  error: null,
  
  // Basic setters
  setLoading: (loading: boolean) => {
    set({ loading })
  },
  
  setError: (error: string | null) => {
    set({ error })
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  // Vote operations
  voteOnPost: async (postId: string, voteType: VoteType, userId: string) => {
    set({ loading: true, error: null })
    
    try {
      const voteData: VoteCreateData = {
        user_id: userId,
        vote_type: voteType
      }
      
      const result = await api.voteOnPost(postId, voteData)
      
      // Update local state optimistically
      const voteKey = `post:${postId}:${userId}`
      const { userVotes, voteCounts } = get()
      
      if ('message' in result) {
        // Vote was removed
        const newUserVotes = new Map(userVotes)
        newUserVotes.delete(voteKey)
        set({ userVotes: newUserVotes })
      } else {
        // Vote was created or updated
        const newUserVotes = new Map(userVotes)
        newUserVotes.set(voteKey, result as Vote)
        set({ userVotes: newUserVotes })
      }
      
      // Refresh vote counts for accuracy
      await get().refreshVoteCounts('post', postId)
      
      set({ loading: false })
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to vote on post'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },
  
  voteOnReply: async (replyId: string, voteType: VoteType, userId: string) => {
    set({ loading: true, error: null })
    
    try {
      const voteData: VoteCreateData = {
        user_id: userId,
        vote_type: voteType
      }
      
      const result = await api.voteOnReply(replyId, voteData)
      
      // Update local state optimistically
      const voteKey = `reply:${replyId}:${userId}`
      const { userVotes } = get()
      
      if ('message' in result) {
        // Vote was removed
        const newUserVotes = new Map(userVotes)
        newUserVotes.delete(voteKey)
        set({ userVotes: newUserVotes })
      } else {
        // Vote was created or updated
        const newUserVotes = new Map(userVotes)
        newUserVotes.set(voteKey, result as Vote)
        set({ userVotes: newUserVotes })
      }
      
      // Refresh vote counts for accuracy
      await get().refreshVoteCounts('reply', replyId)
      
      set({ loading: false })
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to vote on reply'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },
  
  // Vote queries
  getUserVote: (targetType: 'post' | 'reply', targetId: string, userId: string) => {
    const voteKey = `${targetType}:${targetId}:${userId}`
    return get().userVotes.get(voteKey) || null
  },
  
  getVoteCounts: (targetType: 'post' | 'reply', targetId: string) => {
    const countsKey = `${targetType}:${targetId}`
    return get().voteCounts.get(countsKey)
  },
  
  // Data fetching
  refreshVoteCounts: async (targetType: 'post' | 'reply', targetId: string) => {
    try {
      let counts: VoteCounts
      
      if (targetType === 'post') {
        counts = await api.getPostVoteCounts(targetId)
      } else {
        counts = await api.getReplyVoteCounts(targetId)
      }
      
      const countsKey = `${targetType}:${targetId}`
      const { voteCounts } = get()
      const newVoteCounts = new Map(voteCounts)
      newVoteCounts.set(countsKey, counts)
      
      set({ voteCounts: newVoteCounts })
    } catch (error) {
      console.error(`Failed to refresh vote counts for ${targetType}:${targetId}`, error)
    }
  },
  
  refreshUserVote: async (targetType: 'post' | 'reply', targetId: string, userId: string) => {
    try {
      let vote: Vote | null = null
      
      try {
        if (targetType === 'post') {
          vote = await api.getUserVoteOnPost(targetId, userId)
        } else {
          vote = await api.getUserVoteOnReply(targetId, userId)
        }
      } catch (error) {
        // 404 means no vote exists, which is fine
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          vote = null
        } else {
          throw error
        }
      }
      
      const voteKey = `${targetType}:${targetId}:${userId}`
      const { userVotes } = get()
      const newUserVotes = new Map(userVotes)
      
      if (vote) {
        newUserVotes.set(voteKey, vote)
      } else {
        newUserVotes.delete(voteKey)
      }
      
      set({ userVotes: newUserVotes })
    } catch (error) {
      console.error(`Failed to refresh user vote for ${targetType}:${targetId}:${userId}`, error)
    }
  },
  
  // Bulk operations
  refreshMultipleVoteCounts: async (targets: Array<{type: 'post' | 'reply', id: string}>) => {
    const promises = targets.map(target => 
      get().refreshVoteCounts(target.type, target.id)
    )
    
    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Failed to refresh multiple vote counts', error)
    }
  },
  
  // Cleanup
  clearVoteData: () => {
    set({
      userVotes: new Map(),
      voteCounts: new Map(),
      error: null
    })
  },
  
  clearVoteDataForTarget: (targetType: 'post' | 'reply', targetId: string) => {
    const { userVotes, voteCounts } = get()
    
    // Clear user votes for this target
    const newUserVotes = new Map(userVotes)
    const voteKeysToDelete = Array.from(userVotes.keys()).filter(key => 
      key.startsWith(`${targetType}:${targetId}:`)
    )
    voteKeysToDelete.forEach(key => newUserVotes.delete(key))
    
    // Clear vote counts for this target
    const newVoteCounts = new Map(voteCounts)
    const countsKey = `${targetType}:${targetId}`
    newVoteCounts.delete(countsKey)
    
    set({
      userVotes: newUserVotes,
      voteCounts: newVoteCounts
    })
  }
}))