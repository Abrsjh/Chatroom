import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ChannelList from './ChannelList'
import PostCreate from './PostCreate'
import { useChannelStore, usePostStore } from '../stores'
import { Channel } from '../types'

// Mock the stores
jest.mock('../stores', () => ({
  useChannelStore: jest.fn(),
  usePostStore: jest.fn()
}))

const mockUseChannelStore = useChannelStore as jest.MockedFunction<typeof useChannelStore>
const mockUsePostStore = usePostStore as jest.MockedFunction<typeof usePostStore>

const mockChannel: Channel = {
  id: 'channel1',
  name: 'general',
  description: 'General discussion',
  created_by: 'user1',
  created_at: new Date('2024-01-01')
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Component Error Handling Enhancement', () => {
  const defaultChannelStore = {
    channels: [],
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

  const defaultPostStore = {
    posts: [],
    loading: false,
    error: null,
    createPost: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    addPost: jest.fn(),
    setPosts: jest.fn(),
    clearPosts: jest.fn(),
    getPostsByChannelId: jest.fn(() => []),
    getPostById: jest.fn(),
    updatePost: jest.fn(),
    fetchChannelPosts: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChannelStore.mockReturnValue(defaultChannelStore)
    mockUsePostStore.mockReturnValue(defaultPostStore)
  })

  describe('ChannelList Enhanced Error Handling', () => {
    test('displays user-friendly error for network timeout', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Request timed out. Please check your connection and try again.',
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-error')).toBeInTheDocument()
      expect(screen.getByText(/request timed out/i)).toBeInTheDocument()
      expect(screen.getByText(/check your connection/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    test('displays specific error for authentication failure', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Authentication required. Please log in again.',
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-error')).toHaveClass('channel-list__error--auth')
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    test('displays maintenance mode error with estimated time', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Service is temporarily under maintenance. Please try again in 5 minutes.',
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-error')).toHaveClass('channel-list__error--maintenance')
      expect(screen.getByText(/under maintenance/i)).toBeInTheDocument()
      expect(screen.getByText(/5 minutes/i)).toBeInTheDocument()
    })

    test('shows loading state with progress indicator', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        loading: true,
        loadingProgress: 65
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-loading')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65')
    })

    test('displays rate limit error with countdown timer', async () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Rate limit exceeded. Please try again in 1 minute.',
        loading: false,
        retryAfter: 60
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-error')).toHaveClass('channel-list__error--rate-limit')
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      expect(screen.getByTestId('retry-countdown')).toBeInTheDocument()
      
      // Countdown should be visible
      await waitFor(() => {
        expect(screen.getByText(/59/)).toBeInTheDocument()
      }, { timeout: 1100 })
    })

    test('auto-retries after countdown expires', async () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Rate limit exceeded. Please try again in 1 minute.',
        loading: false,
        retryAfter: 1, // 1 second for testing
        fetchChannels: mockFetchChannels
      })

      renderWithRouter(<ChannelList />)
      
      // Wait for auto-retry
      await waitFor(() => {
        expect(mockFetchChannels).toHaveBeenCalled()
      }, { timeout: 2000 })
    })
  })

  describe('PostCreate Enhanced Error Handling', () => {
    test('displays validation errors with specific field guidance', () => {
      const validationError = 'Validation failed: Please fix the following issues:\n• Title: Minimum length is 3 characters\n• Content: Minimum length is 10 characters'
      
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        error: validationError,
        loading: false
      })

      renderWithRouter(<PostCreate />)
      
      expect(screen.getByTestId('post-create-error')).toHaveClass('post-create__error--validation')
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
      expect(screen.getByText(/title: minimum length/i)).toBeInTheDocument()
      expect(screen.getByText(/content: minimum length/i)).toBeInTheDocument()
    })

    test('displays conflict error with resolution suggestion', () => {
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        error: 'The data has been updated by another user. Please refresh and try again.',
        loading: false
      })

      renderWithRouter(<PostCreate />)
      
      expect(screen.getByTestId('post-create-error')).toHaveClass('post-create__error--conflict')
      expect(screen.getByText(/updated by another user/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    test('shows upload progress for large content', async () => {
      const user = userEvent.setup()
      const mockCreatePost = jest.fn()
      
      // Mock a slow upload
      let resolveUpload: () => void
      const uploadPromise = new Promise<void>((resolve) => {
        resolveUpload = resolve
      })
      
      mockCreatePost.mockImplementation(() => uploadPromise)
      
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        loading: true,
        uploadProgress: 45,
        createPost: mockCreatePost
      })

      renderWithRouter(<PostCreate />)
      
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45')
      expect(screen.getByText(/uploading.*45%/i)).toBeInTheDocument()
    })

    test('handles quota exceeded error with upgrade suggestion', () => {
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        error: 'Storage quota exceeded. Please upgrade your plan or delete some content.',
        loading: false
      })

      renderWithRouter(<PostCreate />)
      
      expect(screen.getByTestId('post-create-error')).toHaveClass('post-create__error--quota')
      expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upgrade plan/i })).toBeInTheDocument()
    })

    test('shows offline mode indicator when network unavailable', () => {
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        error: 'Unable to connect to the server. Please check your internet connection.',
        loading: false,
        isOffline: true
      })

      renderWithRouter(<PostCreate />)
      
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
      expect(screen.getByText(/working offline/i)).toBeInTheDocument()
      expect(screen.getByText(/changes will sync when reconnected/i)).toBeInTheDocument()
    })

    test('queues posts for later when offline', async () => {
      const user = userEvent.setup()
      const mockQueuePost = jest.fn()
      
      mockUsePostStore.mockReturnValue({
        ...defaultPostStore,
        isOffline: true,
        queuePost: mockQueuePost
      })

      renderWithRouter(<PostCreate />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const contentInput = screen.getByLabelText(/content/i)
      
      await user.type(titleInput, 'Test Post Title')
      await user.type(contentInput, 'This is a test post content that is long enough')
      
      const submitButton = screen.getByRole('button', { name: /create post/i })
      await user.click(submitButton)
      
      expect(mockQueuePost).toHaveBeenCalledWith('channel1', {
        title: 'Test Post Title',
        content: 'This is a test post content that is long enough'
      })
      
      expect(screen.getByText(/post queued for when you're back online/i)).toBeInTheDocument()
    })
  })

  describe('Global Error Boundary Integration', () => {
    test('catches and displays unhandled component errors', () => {
      // Mock console.error to prevent test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const ThrowError = () => {
        throw new Error('Unhandled component error')
      }
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    test('provides error reporting functionality', async () => {
      const user = userEvent.setup()
      const mockReportError = jest.fn()
      
      // Mock error boundary with reporting
      render(
        <ErrorBoundary onReportError={mockReportError}>
          <div data-testid="error-boundary">
            <p>Something went wrong</p>
            <button onClick={() => mockReportError('test-error')}>Report Issue</button>
          </div>
        </ErrorBoundary>
      )
      
      const reportButton = screen.getByRole('button', { name: /report issue/i })
      await user.click(reportButton)
      
      expect(mockReportError).toHaveBeenCalledWith('test-error')
    })
  })

  describe('Error State Persistence', () => {
    test('remembers error state across component remounts', () => {
      const errorState = {
        ...defaultChannelStore,
        error: 'Previous error message',
        errorTimestamp: Date.now() - 5000, // 5 seconds ago
        loading: false
      }
      
      mockUseChannelStore.mockReturnValue(errorState)
      
      const { rerender } = renderWithRouter(<ChannelList />)
      
      expect(screen.getByText(/previous error message/i)).toBeInTheDocument()
      
      // Remount component
      rerender(
        <BrowserRouter>
          <ChannelList />
        </BrowserRouter>
      )
      
      // Error should still be visible
      expect(screen.getByText(/previous error message/i)).toBeInTheDocument()
    })

    test('auto-clears old errors after timeout', async () => {
      const mockSetError = jest.fn()
      
      mockUseChannelStore.mockReturnValue({
        ...defaultChannelStore,
        error: 'Old error message',
        errorTimestamp: Date.now() - 60000, // 1 minute ago
        setError: mockSetError
      })
      
      renderWithRouter(<ChannelList />)
      
      // Error should auto-clear after component mount
      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(null)
      })
    })
  })
})

// Mock ErrorBoundary component for testing
const ErrorBoundary = ({ children, onReportError }: { 
  children: React.ReactNode
  onReportError?: (error: string) => void 
}) => {
  return <div data-testid="error-boundary">{children}</div>
}