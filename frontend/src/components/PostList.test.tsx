import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PostList from './PostList'
import { usePostStore } from '../stores'
import { Post } from '../types'

// Mock the store
jest.mock('../stores', () => ({
  usePostStore: jest.fn()
}))

const mockUsePostStore = usePostStore as jest.MockedFunction<typeof usePostStore>

const mockPosts: Post[] = [
  {
    id: 'post1',
    channel_id: 'channel1',
    user_id: 'user1',
    title: 'First Post',
    content: 'Content of the first post',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: 'post2',
    channel_id: 'channel1',
    user_id: 'user2',
    title: 'Second Post',
    content: 'Content of the second post',
    created_at: new Date('2024-01-01T11:00:00Z'),
    updated_at: new Date('2024-01-01T11:00:00Z')
  },
  {
    id: 'post3',
    channel_id: 'channel2',
    user_id: 'user1',
    title: 'Different Channel Post',
    content: 'This post is in a different channel',
    created_at: new Date('2024-01-01T12:00:00Z'),
    updated_at: new Date('2024-01-01T12:00:00Z')
  }
]

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('PostList Component', () => {
  const mockGetPostsByChannelId = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePostStore.mockReturnValue({
      posts: mockPosts,
      getPostsByChannelId: mockGetPostsByChannelId,
      addPost: jest.fn(),
      setPosts: jest.fn(),
      clearPosts: jest.fn(),
      getPostById: jest.fn(),
      updatePost: jest.fn()
    })
  })

  test('renders post list title', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 2))
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    expect(screen.getByText('Posts')).toBeInTheDocument()
  })

  test('displays posts for specific channel', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 2))
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    expect(screen.getByText('First Post')).toBeInTheDocument()
    expect(screen.getByText('Second Post')).toBeInTheDocument()
    expect(screen.queryByText('Different Channel Post')).not.toBeInTheDocument()
  })

  test('calls getPostsByChannelId with correct channel ID', () => {
    mockGetPostsByChannelId.mockReturnValue([])
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    expect(mockGetPostsByChannelId).toHaveBeenCalledWith('channel1')
  })

  test('displays empty state when no posts in channel', () => {
    mockGetPostsByChannelId.mockReturnValue([])
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to start a discussion in this channel!')).toBeInTheDocument()
  })

  test('renders posts in correct order (newest first)', () => {
    const sortedPosts = [...mockPosts.slice(0, 2)].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    mockGetPostsByChannelId.mockReturnValue(sortedPosts)
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    const posts = screen.getAllByTestId('post-item')
    expect(posts).toHaveLength(2)
    // First post should be the newer one
    expect(posts[0]).toHaveTextContent('Second Post')
    expect(posts[1]).toHaveTextContent('First Post')
  })

  test('renders posts with compact view when compact prop is true', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 1))
    
    renderWithRouter(<PostList channelId="channel1" compact />)
    
    const postElement = screen.getByTestId('post-item')
    expect(postElement).toHaveClass('post-item--compact')
  })

  test('renders posts in full view by default', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 1))
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    const postElement = screen.getByTestId('post-item')
    expect(postElement).not.toHaveClass('post-item--compact')
  })

  test('shows post count in title', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 2))
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    expect(screen.getByText('Posts (2)')).toBeInTheDocument()
  })

  test('updates when channel ID changes', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 2))
    
    const { rerender } = renderWithRouter(<PostList channelId="channel1" />)
    
    expect(mockGetPostsByChannelId).toHaveBeenCalledWith('channel1')
    
    // Change channel ID
    rerender(
      <BrowserRouter>
        <PostList channelId="channel2" />
      </BrowserRouter>
    )
    
    expect(mockGetPostsByChannelId).toHaveBeenCalledWith('channel2')
  })

  test('renders proper list structure', () => {
    mockGetPostsByChannelId.mockReturnValue(mockPosts.slice(0, 2))
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    const list = screen.getByRole('list')
    const listItems = screen.getAllByRole('listitem')
    
    expect(list).toBeInTheDocument()
    expect(listItems).toHaveLength(2)
  })

  test('includes create post link when showCreateLink is true', () => {
    mockGetPostsByChannelId.mockReturnValue([])
    
    renderWithRouter(<PostList channelId="channel1" showCreateLink />)
    
    const createLink = screen.getByRole('link', { name: /create first post/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute('href', '/create-post')
  })

  test('does not show create post link by default', () => {
    mockGetPostsByChannelId.mockReturnValue([])
    
    renderWithRouter(<PostList channelId="channel1" />)
    
    const createLink = screen.queryByRole('link', { name: /create first post/i })
    expect(createLink).not.toBeInTheDocument()
  })
})