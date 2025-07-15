import { act, renderHook, waitFor } from '@testing-library/react'
import { usePostStore } from './postStore'
import { Post } from '../types'
import * as api from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockApi = api as jest.Mocked<typeof api>

const mockPost: Post = {
  id: '1',
  channel_id: 'channel1',
  user_id: 'user1',
  title: 'Test Post',
  content: 'This is a test post content',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

const mockPosts: Post[] = [
  mockPost,
  {
    id: '2',
    channel_id: 'channel1',
    user_id: 'user2',
    title: 'Another Post',
    content: 'Another test post content',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02')
  }
]

describe('Post Store - API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { result } = renderHook(() => usePostStore())
    act(() => {
      result.current.clearPosts()
    })
  })

  describe('Loading and Error States', () => {
    test('initial state includes loading and error states', () => {
      const { result } = renderHook(() => usePostStore())
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('setLoading updates loading state', () => {
      const { result } = renderHook(() => usePostStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })

    test('setError updates error state', () => {
      const { result } = renderHook(() => usePostStore())
      const errorMessage = 'Failed to create post'
      
      act(() => {
        result.current.setError(errorMessage)
      })
      
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('fetchChannelPosts API Integration', () => {
    test('fetchChannelPosts calls API and updates store on success', async () => {
      mockApi.getChannelPosts.mockResolvedValueOnce(mockPosts)
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.fetchChannelPosts('channel1')
      })
      
      expect(mockApi.getChannelPosts).toHaveBeenCalledWith('channel1')
      expect(result.current.posts).toEqual(mockPosts)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('fetchChannelPosts sets loading state during API call', async () => {
      let resolvePromise: (value: Post[]) => void
      const apiPromise = new Promise<Post[]>((resolve) => {
        resolvePromise = resolve
      })
      mockApi.getChannelPosts.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => usePostStore())
      
      // Start the fetch
      act(() => {
        result.current.fetchChannelPosts('channel1')
      })
      
      // Should be loading
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockPosts)
        await apiPromise
      })
      
      // Should no longer be loading
      expect(result.current.loading).toBe(false)
      expect(result.current.posts).toEqual(mockPosts)
    })

    test('fetchChannelPosts handles API errors', async () => {
      const errorMessage = 'Failed to fetch channel posts: Network error'
      mockApi.getChannelPosts.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.fetchChannelPosts('channel1')
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.posts).toEqual([])
    })

    test('fetchChannelPosts clears previous error on new request', async () => {
      const { result } = renderHook(() => usePostStore())
      
      // Set initial error
      act(() => {
        result.current.setError('Previous error')
      })
      
      mockApi.getChannelPosts.mockResolvedValueOnce(mockPosts)
      
      await act(async () => {
        await result.current.fetchChannelPosts('channel1')
      })
      
      expect(result.current.error).toBeNull()
      expect(result.current.posts).toEqual(mockPosts)
    })
  })

  describe('createPost API Integration', () => {
    test('createPost calls API and adds post to store', async () => {
      const postData = { title: 'New Post', content: 'New post content' }
      const createdPost: Post = {
        id: '3',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'New Post',
        content: 'New post content',
        created_at: new Date(),
        updated_at: new Date()
      }
      
      mockApi.createPost.mockResolvedValueOnce(createdPost)
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.createPost('channel1', postData)
      })
      
      expect(mockApi.createPost).toHaveBeenCalledWith('channel1', postData)
      expect(result.current.posts).toContainEqual(createdPost)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('createPost handles API errors', async () => {
      const postData = { title: '', content: 'Invalid post' }
      const errorMessage = 'Failed to create post: Validation error'
      
      mockApi.createPost.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.createPost('channel1', postData)
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
      expect(result.current.posts).toEqual([])
    })

    test('createPost sets loading state during API call', async () => {
      const postData = { title: 'Test', content: 'Test content' }
      let resolvePromise: (value: Post) => void
      const apiPromise = new Promise<Post>((resolve) => {
        resolvePromise = resolve
      })
      mockApi.createPost.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => usePostStore())
      
      // Start the creation
      act(() => {
        result.current.createPost('channel1', postData)
      })
      
      // Should be loading
      expect(result.current.loading).toBe(true)
      
      // Resolve the promise
      const createdPost = { ...mockPost, id: '3', title: 'Test' }
      await act(async () => {
        resolvePromise!(createdPost)
        await apiPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    test('createPost returns created post on success', async () => {
      const postData = { title: 'New Post', content: 'New post content' }
      const createdPost: Post = {
        id: '3',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'New Post',
        content: 'New post content',
        created_at: new Date(),
        updated_at: new Date()
      }
      
      mockApi.createPost.mockResolvedValueOnce(createdPost)
      
      const { result } = renderHook(() => usePostStore())
      
      let returnedPost: Post | undefined
      await act(async () => {
        returnedPost = await result.current.createPost('channel1', postData)
      })
      
      expect(returnedPost).toEqual(createdPost)
    })
  })

  describe('fetchPost API Integration', () => {
    test('fetchPost calls API and updates store with single post', async () => {
      mockApi.getPost.mockResolvedValueOnce(mockPost)
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.fetchPost('1')
      })
      
      expect(mockApi.getPost).toHaveBeenCalledWith('1')
      expect(result.current.posts).toContainEqual(mockPost)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('fetchPost handles post not found error', async () => {
      const errorMessage = 'Failed to fetch post: 404 - Not Found'
      mockApi.getPost.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => usePostStore())
      
      await act(async () => {
        await result.current.fetchPost('999')
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
    })

    test('fetchPost updates existing post if already in store', async () => {
      const { result } = renderHook(() => usePostStore())
      
      // Add initial post
      act(() => {
        result.current.addPost(mockPost)
      })
      
      // Fetch updated version
      const updatedPost = { ...mockPost, title: 'Updated Title' }
      mockApi.getPost.mockResolvedValueOnce(updatedPost)
      
      await act(async () => {
        await result.current.fetchPost('1')
      })
      
      expect(result.current.posts).toHaveLength(1)
      expect(result.current.posts[0].title).toBe('Updated Title')
    })
  })

  describe('Legacy Store Methods', () => {
    test('existing store methods still work with API integration', () => {
      const { result } = renderHook(() => usePostStore())
      
      act(() => {
        result.current.addPost(mockPost)
      })
      
      expect(result.current.posts).toContainEqual(mockPost)
      expect(result.current.getPostById('1')).toEqual(mockPost)
      expect(result.current.getPostsByChannelId('channel1')).toContainEqual(mockPost)
      
      const updatedPost = { ...mockPost, title: 'Updated' }
      act(() => {
        result.current.updatePost(updatedPost)
      })
      
      expect(result.current.posts[0].title).toBe('Updated')
      
      act(() => {
        result.current.clearPosts()
      })
      
      expect(result.current.posts).toEqual([])
    })
  })
})