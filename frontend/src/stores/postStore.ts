import { create } from 'zustand'
import { Post, PostSortType } from '../types'
import * as api from '../services/api'
import { sortPosts } from '../utils/postRanking'

interface PostState {
  posts: Post[]
  loading: boolean
  error: string | null
  sortType: PostSortType
  timeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
  addPost: (post: Post) => void
  setPosts: (posts: Post[]) => void
  clearPosts: () => void
  getPostsByChannelId: (channelId: string) => Post[]
  getPostById: (id: string) => Post | undefined
  updatePost: (post: Post) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchChannelPosts: (channelId: string) => Promise<void>
  createPost: (channelId: string, data: api.CreatePostData) => Promise<Post>
  fetchPost: (id: string) => Promise<void>
  setSortType: (sortType: PostSortType) => void
  setTimeWindow: (timeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => void
  getSortedPosts: (channelId: string, sortType?: PostSortType, timeWindow?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => Post[]
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  sortType: 'new',
  timeWindow: 'all',
  
  addPost: (post: Post) => {
    set((state) => ({
      posts: [...state.posts, post]
    }))
  },
  
  setPosts: (posts: Post[]) => {
    set({ posts })
  },
  
  clearPosts: () => {
    set({ posts: [] })
  },
  
  getPostsByChannelId: (channelId: string) => {
    return get().posts.filter(post => post.channel_id === channelId)
  },
  
  getPostById: (id: string) => {
    return get().posts.find(post => post.id === id)
  },
  
  updatePost: (updatedPost: Post) => {
    set((state) => ({
      posts: state.posts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    }))
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  fetchChannelPosts: async (channelId: string) => {
    set({ loading: true, error: null })
    try {
      const posts = await api.getChannelPosts(channelId)
      set({ posts, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channel posts'
      set({ error: errorMessage, loading: false })
    }
  },

  createPost: async (channelId: string, data: api.CreatePostData) => {
    set({ loading: true, error: null })
    try {
      const newPost = await api.createPost(channelId, data)
      set((state) => ({
        posts: [...state.posts, newPost],
        loading: false
      }))
      return newPost
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  fetchPost: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const post = await api.getPost(id)
      const currentPosts = get().posts
      const existingPostIndex = currentPosts.findIndex(p => p.id === id)
      
      if (existingPostIndex >= 0) {
        // Update existing post
        set((state) => ({
          posts: state.posts.map(p => p.id === id ? post : p),
          loading: false
        }))
      } else {
        // Add new post
        set((state) => ({
          posts: [...state.posts, post],
          loading: false
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch post'
      set({ error: errorMessage, loading: false })
    }
  },

  setSortType: (sortType: PostSortType) => {
    set({ sortType })
  },

  setTimeWindow: (timeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => {
    set({ timeWindow })
  },

  getSortedPosts: (channelId: string, sortType?: PostSortType, timeWindow?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => {
    const state = get()
    const currentSortType = sortType || state.sortType
    const currentTimeWindow = timeWindow || state.timeWindow
    
    const channelPosts = state.posts.filter(post => post.channel_id === channelId)
    return sortPosts(channelPosts, currentSortType, currentTimeWindow)
  }
}))