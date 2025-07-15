import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PostList from '../PostList'
import { usePostStore } from '../../stores'
import { Post, PostSortType } from '../../types'

// Mock the stores
jest.mock('../../stores', () => ({
  usePostStore: jest.fn()
}))

const mockUsePostStore = usePostStore as jest.MockedFunction<typeof usePostStore>

const samplePosts: Post[] = [
  {
    id: '1',
    channel_id: 'ch1',
    author_id: 'user1',
    title: 'Hot Post',
    content: 'This should rank high on hot',
    created_at: new Date('2023-01-01T12:00:00Z'),
    updated_at: new Date('2023-01-01T12:00:00Z'),
    upvote_count: 100,
    downvote_count: 10,
    net_votes: 90,
    total_votes: 110
  },
  {
    id: '2',
    channel_id: 'ch1',
    author_id: 'user2',
    title: 'New Post',
    content: 'This is the newest post',
    created_at: new Date('2023-01-02T12:00:00Z'),
    updated_at: new Date('2023-01-02T12:00:00Z'),
    upvote_count: 5,
    downvote_count: 1,
    net_votes: 4,
    total_votes: 6
  },
  {
    id: '3',
    channel_id: 'ch1',
    author_id: 'user3',
    title: 'Top Post',
    content: 'This has the highest score',
    created_at: new Date('2022-12-01T12:00:00Z'),
    updated_at: new Date('2022-12-01T12:00:00Z'),
    upvote_count: 200,
    downvote_count: 20,
    net_votes: 180,
    total_votes: 220
  }
]

const defaultStore = {
  posts: samplePosts,
  loading: false,
  error: null,
  addPost: jest.fn(),
  setPosts: jest.fn(),
  clearPosts: jest.fn(),
  getPostsByChannelId: jest.fn(() => samplePosts),
  getPostById: jest.fn(),
  updatePost: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  fetchChannelPosts: jest.fn(),
  createPost: jest.fn(),
  fetchPost: jest.fn(),
  setSortType: jest.fn(),
  sortType: 'new' as PostSortType,
  timeWindow: 'all' as const,
  setTimeWindow: jest.fn(),
  getSortedPosts: jest.fn(() => samplePosts)
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('PostList Sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePostStore.mockReturnValue(defaultStore)
  })

  describe('Sort Controls', () => {
    it('should render sorting controls', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('new')).toBeInTheDocument()
    })

    it('should display all sort options', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i })
      fireEvent.click(sortSelect)
      
      expect(screen.getByRole('option', { name: /hot/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /new/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /top/i })).toBeInTheDocument()
    })

    it('should call setSortType when sort option changes', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i })
      fireEvent.change(sortSelect, { target: { value: 'hot' } })
      
      expect(defaultStore.setSortType).toHaveBeenCalledWith('hot')
    })

    it('should render time window selector for top sort', () => {
      const topSortStore = { ...defaultStore, sortType: 'top' as PostSortType }
      mockUsePostStore.mockReturnValue(topSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByRole('combobox', { name: /time window/i })).toBeInTheDocument()
    })

    it('should call setTimeWindow when time window changes', () => {
      const topSortStore = { ...defaultStore, sortType: 'top' as PostSortType }
      mockUsePostStore.mockReturnValue(topSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      const timeSelect = screen.getByRole('combobox', { name: /time window/i })
      fireEvent.change(timeSelect, { target: { value: 'week' } })
      
      expect(defaultStore.setTimeWindow).toHaveBeenCalledWith('week')
    })
  })

  describe('Hot Sorting', () => {
    it('should call getSortedPosts with hot sorting', () => {
      const hotSortStore = { ...defaultStore, sortType: 'hot' as PostSortType }
      mockUsePostStore.mockReturnValue(hotSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch1', 'hot', 'all')
    })

    it('should display posts sorted by hot algorithm', async () => {
      const hotSortedPosts = [samplePosts[0], samplePosts[1], samplePosts[2]] // Hot algorithm order
      const hotSortStore = { 
        ...defaultStore, 
        sortType: 'hot' as PostSortType,
        getSortedPosts: jest.fn(() => hotSortedPosts)
      }
      mockUsePostStore.mockReturnValue(hotSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      const postTitles = screen.getAllByRole('heading', { level: 3 })
      expect(postTitles[0]).toHaveTextContent('Hot Post')
    })
  })

  describe('New Sorting', () => {
    it('should call getSortedPosts with new sorting', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch1', 'new', 'all')
    })

    it('should display posts sorted by creation date', async () => {
      const newSortedPosts = [samplePosts[1], samplePosts[0], samplePosts[2]] // Newest first
      const newSortStore = { 
        ...defaultStore,
        getSortedPosts: jest.fn(() => newSortedPosts)
      }
      mockUsePostStore.mockReturnValue(newSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      const postTitles = screen.getAllByRole('heading', { level: 3 })
      expect(postTitles[0]).toHaveTextContent('New Post')
    })
  })

  describe('Top Sorting', () => {
    it('should call getSortedPosts with top sorting and time window', () => {
      const topSortStore = { 
        ...defaultStore, 
        sortType: 'top' as PostSortType,
        timeWindow: 'week' as const
      }
      mockUsePostStore.mockReturnValue(topSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch1', 'top', 'week')
    })

    it('should display posts sorted by score', async () => {
      const topSortedPosts = [samplePosts[2], samplePosts[0], samplePosts[1]] // Highest score first
      const topSortStore = { 
        ...defaultStore, 
        sortType: 'top' as PostSortType,
        getSortedPosts: jest.fn(() => topSortedPosts)
      }
      mockUsePostStore.mockReturnValue(topSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      const postTitles = screen.getAllByRole('heading', { level: 3 })
      expect(postTitles[0]).toHaveTextContent('Top Post')
    })

    it('should filter posts by time window', () => {
      const recentDate = new Date()
      const weekOldPosts = [
        { ...samplePosts[0], created_at: new Date(recentDate.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { ...samplePosts[1], created_at: new Date(recentDate.getTime() - 10 * 24 * 60 * 60 * 1000) }  // 10 days ago
      ]
      
      const topSortStore = { 
        ...defaultStore, 
        sortType: 'top' as PostSortType,
        timeWindow: 'week' as const,
        getSortedPosts: jest.fn(() => [weekOldPosts[0]]) // Only recent post returned
      }
      mockUsePostStore.mockReturnValue(topSortStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch1', 'top', 'week')
    })
  })

  describe('Sort Persistence', () => {
    it('should maintain sort state when navigating', () => {
      const persistentStore = { 
        ...defaultStore, 
        sortType: 'hot' as PostSortType 
      }
      mockUsePostStore.mockReturnValue(persistentStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByDisplayValue('hot')).toBeInTheDocument()
    })

    it('should apply sort to new channel when switching', () => {
      const sortStore = { 
        ...defaultStore, 
        sortType: 'top' as PostSortType 
      }
      mockUsePostStore.mockReturnValue(sortStore)
      
      const { rerender } = renderWithRouter(<PostList channelId="ch1" />)
      
      rerender(
        <BrowserRouter>
          <PostList channelId="ch2" />
        </BrowserRouter>
      )
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch2', 'top', 'all')
    })
  })

  describe('Loading States', () => {
    it('should show loading state while sorting', () => {
      const loadingStore = { ...defaultStore, loading: true }
      mockUsePostStore.mockReturnValue(loadingStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should disable sort controls while loading', () => {
      const loadingStore = { ...defaultStore, loading: true }
      mockUsePostStore.mockReturnValue(loadingStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when sorting fails', () => {
      const errorStore = { ...defaultStore, error: 'Failed to sort posts' }
      mockUsePostStore.mockReturnValue(errorStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByText('Failed to sort posts')).toBeInTheDocument()
    })

    it('should fallback to default sort when error occurs', () => {
      const errorStore = { 
        ...defaultStore, 
        error: 'Sort error',
        getSortedPosts: jest.fn(() => samplePosts) // Fallback to unsorted
      }
      mockUsePostStore.mockReturnValue(errorStore)
      
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(defaultStore.getSortedPosts).toHaveBeenCalledWith('ch1', 'new', 'all')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for sort controls', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      expect(screen.getByRole('combobox', { name: /sort by/i })).toHaveAttribute('aria-label')
    })

    it('should announce sort changes to screen readers', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i })
      fireEvent.change(sortSelect, { target: { value: 'hot' } })
      
      expect(screen.getByRole('status')).toHaveTextContent(/sorted by hot/i)
    })

    it('should maintain focus after sort change', () => {
      renderWithRouter(<PostList channelId="ch1" />)
      
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i })
      sortSelect.focus()
      fireEvent.change(sortSelect, { target: { value: 'top' } })
      
      expect(document.activeElement).toBe(sortSelect)
    })
  })
})