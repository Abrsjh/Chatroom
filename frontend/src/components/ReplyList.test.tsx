import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReplyList from './ReplyList'
import { useReplyStore } from '../stores/replyStore'
import { Reply } from '../types'

// Mock the reply store
jest.mock('../stores/replyStore')

const mockUseReplyStore = useReplyStore as jest.MockedFunction<typeof useReplyStore>

describe('ReplyList Component', () => {
  const mockReplies: Reply[] = [
    {
      id: '1',
      post_id: 'post1',
      author_id: 'user1',
      content: 'This is a root reply',
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-01T10:00:00Z'),
      is_edited: false,
      depth: 0,
      upvote_count: 5,
      downvote_count: 1,
      net_votes: 4,
      can_reply_to: true
    },
    {
      id: '2',
      post_id: 'post1',
      author_id: 'user2',
      parent_id: '1',
      content: 'This is a nested reply',
      created_at: new Date('2024-01-01T10:05:00Z'),
      updated_at: new Date('2024-01-01T10:05:00Z'),
      is_edited: false,
      depth: 1,
      upvote_count: 3,
      downvote_count: 0,
      net_votes: 3,
      can_reply_to: true
    },
    {
      id: '3',
      post_id: 'post1',
      author_id: 'user1',
      parent_id: '2',
      content: 'This is deeply nested',
      created_at: new Date('2024-01-01T10:10:00Z'),
      updated_at: new Date('2024-01-01T10:10:00Z'),
      is_edited: false,
      depth: 2,
      upvote_count: 1,
      downvote_count: 0,
      net_votes: 1,
      can_reply_to: true
    }
  ]

  const mockStore = {
    replies: mockReplies,
    loading: false,
    error: null,
    currentPostId: 'post1',
    expandedThreads: new Set<string>(),
    replyingTo: null,
    editingReply: null,
    fetchReplies: jest.fn(),
    createReply: jest.fn(),
    updateReply: jest.fn(),
    deleteReply: jest.fn(),
    toggleThread: jest.fn(),
    expandThread: jest.fn(),
    collapseThread: jest.fn(),
    isThreadExpanded: jest.fn(),
    getRepliesByParent: jest.fn(),
    getReplyById: jest.fn(),
    getReplyChildren: jest.fn(),
    setReplyingTo: jest.fn(),
    setEditingReply: jest.fn(),
    clearReplies: jest.fn(),
    clearError: jest.fn()
  }

  beforeEach(() => {
    mockUseReplyStore.mockReturnValue(mockStore)
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders empty state when no replies', () => {
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        replies: []
      })

      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('reply-list-empty')).toBeInTheDocument()
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument()
    })

    it('renders loading state', () => {
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        loading: true,
        replies: []
      })

      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('reply-list-loading')).toBeInTheDocument()
      expect(screen.getByText(/loading replies/i)).toBeInTheDocument()
    })

    it('renders error state', () => {
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        error: 'Failed to load replies'
      })

      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('reply-list-error')).toBeInTheDocument()
      expect(screen.getByText(/failed to load replies/i)).toBeInTheDocument()
    })

    it('renders replies with correct structure', () => {
      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('reply-list-container')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^reply-/)).toHaveLength(3)
    })
  })

  describe('Threaded Display', () => {
    it('displays replies with proper indentation based on depth', () => {
      render(<ReplyList postId="post1" />)
      
      const rootReply = screen.getByTestId('reply-1')
      const nestedReply = screen.getByTestId('reply-2')
      const deepNestedReply = screen.getByTestId('reply-3')
      
      expect(rootReply).toHaveClass('reply-depth-0')
      expect(nestedReply).toHaveClass('reply-depth-1')
      expect(deepNestedReply).toHaveClass('reply-depth-2')
    })

    it('shows expand/collapse buttons for replies with children', () => {
      mockStore.getReplyChildren.mockImplementation((replyId) => {
        if (replyId === '1') return [mockReplies[1]]
        if (replyId === '2') return [mockReplies[2]]
        return []
      })

      render(<ReplyList postId="post1" />)
      
      const rootReply = screen.getByTestId('reply-1')
      const nestedReply = screen.getByTestId('reply-2')
      const deepNestedReply = screen.getByTestId('reply-3')
      
      expect(rootReply).toContainElement(screen.getByTestId('expand-button-1'))
      expect(nestedReply).toContainElement(screen.getByTestId('expand-button-2'))
      expect(deepNestedReply).not.toContainElement(screen.queryByTestId('expand-button-3'))
    })

    it('toggles thread expansion when expand button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" />)
      
      const expandButton = screen.getByTestId('expand-button-1')
      await user.click(expandButton)
      
      expect(mockStore.toggleThread).toHaveBeenCalledWith('1')
    })

    it('hides children when thread is collapsed', () => {
      mockStore.isThreadExpanded.mockReturnValue(false)
      
      render(<ReplyList postId="post1" />)
      
      // Should only show root reply when collapsed
      expect(screen.getByTestId('reply-1')).toBeInTheDocument()
      expect(screen.queryByTestId('reply-2')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reply-3')).not.toBeInTheDocument()
    })

    it('shows children when thread is expanded', () => {
      mockStore.isThreadExpanded.mockReturnValue(true)
      
      render(<ReplyList postId="post1" />)
      
      // Should show all replies when expanded
      expect(screen.getByTestId('reply-1')).toBeInTheDocument()
      expect(screen.getByTestId('reply-2')).toBeInTheDocument()
      expect(screen.getByTestId('reply-3')).toBeInTheDocument()
    })
  })

  describe('Reply Actions', () => {
    it('shows reply button on hover', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" />)
      
      const replyItem = screen.getByTestId('reply-1')
      await user.hover(replyItem)
      
      expect(screen.getByTestId('reply-button-1')).toBeInTheDocument()
    })

    it('triggers reply action when reply button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" />)
      
      const replyButton = screen.getByTestId('reply-button-1')
      await user.click(replyButton)
      
      expect(mockStore.setReplyingTo).toHaveBeenCalledWith('1')
    })

    it('shows edit button for own replies', () => {
      render(<ReplyList postId="post1" currentUserId="user1" />)
      
      const ownReply = screen.getByTestId('reply-1')
      expect(ownReply).toContainElement(screen.getByTestId('edit-button-1'))
      
      const otherReply = screen.getByTestId('reply-2')
      expect(otherReply).not.toContainElement(screen.queryByTestId('edit-button-2'))
    })

    it('triggers edit action when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" currentUserId="user1" />)
      
      const editButton = screen.getByTestId('edit-button-1')
      await user.click(editButton)
      
      expect(mockStore.setEditingReply).toHaveBeenCalledWith('1')
    })

    it('shows delete button for own replies', () => {
      render(<ReplyList postId="post1" currentUserId="user1" />)
      
      const ownReply = screen.getByTestId('reply-1')
      expect(ownReply).toContainElement(screen.getByTestId('delete-button-1'))
      
      const otherReply = screen.getByTestId('reply-2')
      expect(otherReply).not.toContainElement(screen.queryByTestId('delete-button-2'))
    })

    it('shows delete confirmation when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" currentUserId="user1" />)
      
      const deleteButton = screen.getByTestId('delete-button-1')
      await user.click(deleteButton)
      
      expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument()
      expect(screen.getByText(/delete this reply/i)).toBeInTheDocument()
    })

    it('deletes reply when confirmation is accepted', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" currentUserId="user1" />)
      
      const deleteButton = screen.getByTestId('delete-button-1')
      await user.click(deleteButton)
      
      const confirmButton = screen.getByTestId('confirm-delete')
      await user.click(confirmButton)
      
      expect(mockStore.deleteReply).toHaveBeenCalledWith('1')
    })
  })

  describe('Reply Display', () => {
    it('displays reply content correctly', () => {
      render(<ReplyList postId="post1" />)
      
      expect(screen.getByText('This is a root reply')).toBeInTheDocument()
      expect(screen.getByText('This is a nested reply')).toBeInTheDocument()
      expect(screen.getByText('This is deeply nested')).toBeInTheDocument()
    })

    it('shows reply metadata', () => {
      render(<ReplyList postId="post1" />)
      
      expect(screen.getByText('user1')).toBeInTheDocument()
      expect(screen.getByText('user2')).toBeInTheDocument()
      expect(screen.getAllByText(/10:0/)).toHaveLength(3) // Timestamps
    })

    it('displays vote counts', () => {
      render(<ReplyList postId="post1" />)
      
      expect(screen.getByText('4')).toBeInTheDocument() // Net votes for reply 1
      expect(screen.getByText('3')).toBeInTheDocument() // Net votes for reply 2
      expect(screen.getByText('1')).toBeInTheDocument() // Net votes for reply 3
    })

    it('shows edited indicator for edited replies', () => {
      const editedReplies = mockReplies.map(reply => ({
        ...reply,
        is_edited: reply.id === '1'
      }))
      
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        replies: editedReplies
      })

      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('edited-indicator-1')).toBeInTheDocument()
      expect(screen.queryByTestId('edited-indicator-2')).not.toBeInTheDocument()
    })

    it('shows depth limit indicator for maximum depth replies', () => {
      const maxDepthReply = {
        ...mockReplies[0],
        id: '4',
        depth: 10,
        can_reply_to: false
      }
      
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        replies: [...mockReplies, maxDepthReply]
      })

      render(<ReplyList postId="post1" />)
      
      expect(screen.getByTestId('max-depth-indicator-4')).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('fetches replies on mount', () => {
      render(<ReplyList postId="post1" />)
      
      expect(mockStore.fetchReplies).toHaveBeenCalledWith('post1', true)
    })

    it('clears replies on unmount', () => {
      const { unmount } = render(<ReplyList postId="post1" />)
      
      unmount()
      
      expect(mockStore.clearReplies).toHaveBeenCalled()
    })

    it('refetches replies when postId changes', () => {
      const { rerender } = render(<ReplyList postId="post1" />)
      
      rerender(<ReplyList postId="post2" />)
      
      expect(mockStore.fetchReplies).toHaveBeenCalledWith('post2', true)
    })

    it('handles retry on error', async () => {
      const user = userEvent.setup()
      
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        error: 'Failed to load replies'
      })

      render(<ReplyList postId="post1" />)
      
      const retryButton = screen.getByTestId('retry-button')
      await user.click(retryButton)
      
      expect(mockStore.fetchReplies).toHaveBeenCalledWith('post1', true)
    })
  })

  describe('Performance', () => {
    it('renders large number of replies efficiently', () => {
      const manyReplies = Array.from({ length: 100 }, (_, i) => ({
        ...mockReplies[0],
        id: `reply-${i}`,
        content: `Reply ${i}`,
        depth: i % 5 // Vary depth
      }))

      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        replies: manyReplies
      })

      const { container } = render(<ReplyList postId="post1" />)
      
      expect(container.querySelectorAll('[data-testid^="reply-"]')).toHaveLength(100)
    })

    it('virtualizes replies when list is very long', () => {
      const manyReplies = Array.from({ length: 1000 }, (_, i) => ({
        ...mockReplies[0],
        id: `reply-${i}`,
        content: `Reply ${i}`,
        depth: 0
      }))

      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        replies: manyReplies
      })

      render(<ReplyList postId="post1" virtualized />)
      
      expect(screen.getByTestId('virtualized-reply-list')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ReplyList postId="post1" />)
      
      expect(screen.getByRole('list')).toHaveAccessibleName('Replies')
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" />)
      
      const firstReply = screen.getByTestId('reply-1')
      firstReply.focus()
      
      await user.keyboard('{ArrowDown}')
      
      expect(screen.getByTestId('reply-2')).toHaveFocus()
    })

    it('announces thread expansion to screen readers', async () => {
      const user = userEvent.setup()
      render(<ReplyList postId="post1" />)
      
      const expandButton = screen.getByTestId('expand-button-1')
      await user.click(expandButton)
      
      expect(screen.getByTestId('sr-announcement')).toHaveTextContent('Thread expanded')
    })
  })
})