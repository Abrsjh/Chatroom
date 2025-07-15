import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostCreate from './PostCreate'
import { usePostStore, useChannelStore } from '../stores'
import { Channel } from '../types'

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

describe('PostCreate Component', () => {
  const mockAddPost = jest.fn()
  const mockSetCurrentChannel = jest.fn()
  const mockOnPostCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUsePostStore.mockReturnValue({
      posts: [],
      addPost: mockAddPost,
      setPosts: jest.fn(),
      clearPosts: jest.fn(),
      getPostsByChannelId: jest.fn(() => []),
      getPostById: jest.fn(),
      updatePost: jest.fn()
    })

    mockUseChannelStore.mockReturnValue({
      channels: [mockChannel],
      currentChannel: mockChannel,
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: jest.fn(),
      setChannels: jest.fn(),
      clearChannels: jest.fn(),
      getChannelById: jest.fn()
    })
  })

  test('renders post creation form', () => {
    render(<PostCreate />)
    
    expect(screen.getByText('Create New Post')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument()
  })

  test('displays current channel name', () => {
    render(<PostCreate />)
    
    expect(screen.getByText(/posting in #general/i)).toBeInTheDocument()
  })

  test('shows message when no channel selected', () => {
    mockUseChannelStore.mockReturnValue({
      channels: [mockChannel],
      currentChannel: null,
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: jest.fn(),
      setChannels: jest.fn(),
      clearChannels: jest.fn(),
      getChannelById: jest.fn()
    })

    render(<PostCreate />)
    
    expect(screen.getByText(/please select a channel first/i)).toBeInTheDocument()
  })

  test('form validation - shows error for empty title', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })

  test('form validation - shows error for empty content', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test Title')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/content is required/i)).toBeInTheDocument()
  })

  test('form validation - shows error for title too short', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Ab')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument()
  })

  test('form validation - shows error for content too short', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const contentInput = screen.getByLabelText(/content/i)
    
    await user.type(titleInput, 'Valid Title')
    await user.type(contentInput, 'Hi')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/content must be at least 10 characters/i)).toBeInTheDocument()
  })

  test('creates post with valid form data', async () => {
    const user = userEvent.setup()
    render(<PostCreate onPostCreated={mockOnPostCreated} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const contentInput = screen.getByLabelText(/content/i)
    
    await user.type(titleInput, 'Test Post Title')
    await user.type(contentInput, 'This is a test post content that is long enough')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddPost).toHaveBeenCalledWith(
        expect.objectContaining({
          channel_id: 'channel1',
          title: 'Test Post Title',
          content: 'This is a test post content that is long enough',
          user_id: 'mock-user-id'
        })
      )
    })
  })

  test('clears form after successful submission', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
    const contentInput = screen.getByLabelText(/content/i) as HTMLTextAreaElement
    
    await user.type(titleInput, 'Test Post Title')
    await user.type(contentInput, 'This is a test post content')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(titleInput.value).toBe('')
      expect(contentInput.value).toBe('')
    })
  })

  test('calls onPostCreated callback after successful submission', async () => {
    const user = userEvent.setup()
    render(<PostCreate onPostCreated={mockOnPostCreated} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const contentInput = screen.getByLabelText(/content/i)
    
    await user.type(titleInput, 'Test Post Title')
    await user.type(contentInput, 'This is a test post content that is long enough')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Post Title',
          content: 'This is a test post content that is long enough'
        })
      )
    })
  })

  test('disables submit button during submission', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const contentInput = screen.getByLabelText(/content/i)
    
    await user.type(titleInput, 'Test Post Title')
    await user.type(contentInput, 'This is a test post content that is long enough')
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    await user.click(submitButton)
    
    expect(submitButton).toBeDisabled()
  })

  test('shows character count for title and content', () => {
    render(<PostCreate />)
    
    expect(screen.getByText(/0\/100/)).toBeInTheDocument() // title counter
    expect(screen.getByText(/0\/1000/)).toBeInTheDocument() // content counter
  })

  test('updates character count as user types', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Hello')
    
    expect(screen.getByText(/5\/100/)).toBeInTheDocument()
  })

  test('prevents submission when character limits exceeded', async () => {
    const user = userEvent.setup()
    render(<PostCreate />)
    
    const titleInput = screen.getByLabelText(/title/i)
    // Type more than 100 characters
    await user.type(titleInput, 'a'.repeat(101))
    
    const submitButton = screen.getByRole('button', { name: /create post/i })
    expect(submitButton).toBeDisabled()
  })
})