import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostCreate from './PostCreate'
import { usePostStore, useChannelStore } from '../stores'
import { Channel, Post } from '../types'
import * as api from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockApi = api as jest.Mocked<typeof api>

// Mock the stores
jest.mock('../stores', () => ({
  usePostStore: jest.fn(),
  useChannelStore: jest.fn()
}))

const mockUsePostStore = usePostStore as jest.MockedFunction<typeof usePostStore>
const mockUseChannelStore = useChannelStore as jest.MockedFunction<typeof useChannelStore>

const mockChannel: Channel = {
  id: 'channel1',
  name: 'general',
  description: 'General discussion',
  created_by: 'user1',
  created_at: new Date('2024-01-01')
}

describe('PostCreate Component - API Integration', () => {
  const mockCreatePost = jest.fn()
  const mockSetLoading = jest.fn()
  const mockSetError = jest.fn()
  const mockOnPostCreated = jest.fn()

  const defaultPostStore = {
    posts: [],
    loading: false,
    error: null,
    createPost: mockCreatePost,
    setLoading: mockSetLoading,
    setError: mockSetError,
    addPost: jest.fn(),
    setPosts: jest.fn(),
    clearPosts: jest.fn(),
    getPostsByChannelId: jest.fn(() => []),
    getPostById: jest.fn(),
    updatePost: jest.fn(),
    fetchChannelPosts: jest.fn()
  }

  const defaultChannelStore = {
    channels: [mockChannel],
    currentChannel: mockChannel,
    loading: false,
    error: null,
    setCurrentChannel: jest.fn(),
    addChannel: jest.fn(),
    setChannels: jest.fn(),
    clearChannels: jest.fn(),
    getChannelById: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    fetchChannels: jest.fn(),
    createChannel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePostStore.mockReturnValue(defaultPostStore)
    mockUseChannelStore.mockReturnValue(defaultChannelStore)
  })

  describe('API Integration', () => {
    test('calls createPost API on form submission', async () => {
      const user = userEvent.setup()
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'This is a test post content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockCreatePost.mockResolvedValueOnce(createdPost)

      render(<PostCreate onPostCreated={mockOnPostCreated} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'This is a test post content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith('channel1', {
          title: 'Test Post Title',
          content: 'This is a test post content that is long enough'
        })
      })
    })

    test('displays success message after successful post creation', async () => {
      const user = userEvent.setup()
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'Test content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockCreatePost.mockResolvedValueOnce(createdPost)

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('post-create-success')).toBeInTheDocument()
        expect(screen.getByText(/post created successfully/i)).toBeInTheDocument()
      })
    })

    test('calls onPostCreated callback after successful API call', async () => {
      const user = userEvent.setup()
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'Test content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockCreatePost.mockResolvedValueOnce(createdPost)

      render(<PostCreate onPostCreated={mockOnPostCreated} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(createdPost)
      })
    })
  })

  describe('Loading States', () => {
    test('shows loading state while creating post', async () => {
      const user = userEvent.setup()
      let resolveCreatePost: (value: Post) => void
      const createPostPromise = new Promise<Post>((resolve) => {
        resolveCreatePost = resolve
      })
      mockCreatePost.mockReturnValueOnce(createPostPromise)

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText(/creating post.../i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Resolve the promise
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'Test content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }
      
      resolveCreatePost!(createdPost)
      
      await waitFor(() => {
        expect(screen.getByText(/create post/i)).toBeInTheDocument()
        expect(submitButton).not.toBeDisabled()
      })
    })

    test('disables form inputs during loading', async () => {
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        loading: true
      })

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      const submitButton = screen.getByRole('button', { name: /creating post.../i })
      
      expect(titleInput).toBeDisabled()
      expect(contentInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    test('displays API error message when post creation fails', async () => {
      const user = userEvent.setup()
      mockCreatePost.mockRejectedValueOnce(new Error('Failed to create post: Validation error'))

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('post-create-error')).toBeInTheDocument()
        expect(screen.getByText(/failed to create post: validation error/i)).toBeInTheDocument()
      })
    })

    test('displays retry button on API error', async () => {
      const user = userEvent.setup()
      mockCreatePost.mockRejectedValueOnce(new Error('Network error'))

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    test('retries post creation when retry button clicked', async () => {
      const user = userEvent.setup()
      
      // First call fails
      mockCreatePost.mockRejectedValueOnce(new Error('Network error'))
      // Second call succeeds
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'Test content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }
      mockCreatePost.mockResolvedValueOnce(createdPost)

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
      
      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)
      
      // Should call createPost again
      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledTimes(2)
      })
    })

    test('clears error when user starts typing after error', async () => {
      const user = userEvent.setup()
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        error: 'Previous error message'
      })

      render(<PostCreate />)
      
      expect(screen.getByText(/previous error message/i)).toBeInTheDocument()
      
      const titleInput = screen.getByLabelText(/title/i)
      await user.type(titleInput, 'New text')
      
      expect(mockSetError).toHaveBeenCalledWith(null)
    })

    test('shows network connectivity error with specific styling', async () => {
      const user = userEvent.setup()
      mockCreatePost.mockRejectedValueOnce(new Error('Failed to create post: Network error'))

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorElement = screen.getByTestId('post-create-error')
        expect(errorElement).toHaveClass('post-create__error--network')
      })
    })
  })

  describe('Form State Management', () => {
    test('preserves form data after API error', async () => {
      const user = userEvent.setup()
      mockCreatePost.mockRejectedValueOnce(new Error('Server error'))

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
      const contentInput = screen.getByLabelText(/content/i) as HTMLTextAreaElement
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })
      
      // Form data should be preserved
      expect(titleInput.value).toBe('Test Post Title')
      expect(contentInput.value).toBe('Test content that is long enough')
    })

    test('clears form after successful submission', async () => {
      const user = userEvent.setup()
      const createdPost: Post = {
        id: 'post1',
        channel_id: 'channel1',
        user_id: 'user1',
        title: 'Test Post Title',
        content: 'Test content that is long enough',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockCreatePost.mockResolvedValueOnce(createdPost)

      render(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
      const contentInput = screen.getByLabelText(/content/i) as HTMLTextAreaElement
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'Test content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(titleInput.value).toBe('')
        expect(contentInput.value).toBe('')
      })
    })
  })
})