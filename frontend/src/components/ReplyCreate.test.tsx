import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReplyCreate from './ReplyCreate'
import { useReplyStore } from '../stores/replyStore'
import { Reply } from '../types'

// Mock the reply store
jest.mock('../stores/replyStore')

const mockUseReplyStore = useReplyStore as jest.MockedFunction<typeof useReplyStore>

describe('ReplyCreate Component', () => {
  const mockParentReply: Reply = {
    id: '1',
    post_id: 'post1',
    author_id: 'user1',
    content: 'This is the parent reply',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    is_edited: false,
    depth: 0,
    upvote_count: 5,
    downvote_count: 1,
    net_votes: 4,
    can_reply_to: true
  }

  const mockStore = {
    replies: [],
    loading: false,
    error: null,
    currentPostId: 'post1',
    replyingTo: null,
    editingReply: null,
    createReply: jest.fn(),
    updateReply: jest.fn(),
    setReplyingTo: jest.fn(),
    setEditingReply: jest.fn(),
    getReplyById: jest.fn(),
    clearError: jest.fn()
  }

  beforeEach(() => {
    mockUseReplyStore.mockReturnValue(mockStore)
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders reply form with textarea and submit button', () => {
      render(<ReplyCreate postId="post1" />)
      
      expect(screen.getByTestId('reply-create-form')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /write a reply/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /post reply/i })).toBeInTheDocument()
    })

    it('renders cancel button when replying to a specific comment', () => {
      render(<ReplyCreate postId="post1" parentId="1" />)
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('shows parent reply context when replying to a comment', () => {
      mockStore.getReplyById.mockReturnValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" parentId="1" />)
      
      expect(screen.getByTestId('parent-reply-context')).toBeInTheDocument()
      expect(screen.getByText(/replying to/i)).toBeInTheDocument()
      expect(screen.getByText('This is the parent reply')).toBeInTheDocument()
    })

    it('does not show parent context for root replies', () => {
      render(<ReplyCreate postId="post1" />)
      
      expect(screen.queryByTestId('parent-reply-context')).not.toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('allows typing in the textarea', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      await user.type(textarea, 'This is my reply')
      
      expect(textarea).toHaveValue('This is my reply')
    })

    it('auto-resizes textarea based on content', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      
      // Initially should have minimum height
      expect(textarea).toHaveStyle({ height: expect.stringMatching(/40px|auto/) })
      
      // Type multiple lines
      await user.type(textarea, 'Line 1{shift}{enter}Line 2{shift}{enter}Line 3')
      
      // Height should increase
      expect(textarea.scrollHeight).toBeGreaterThan(40)
    })

    it('shows character count', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      await user.type(textarea, 'Hello world')
      
      expect(screen.getByText('11/10000')).toBeInTheDocument()
    })

    it('disables submit button when textarea is empty', () => {
      render(<ReplyCreate postId="post1" />)
      
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when textarea has content', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      
      expect(submitButton).not.toBeDisabled()
    })

    it('prevents submission when content exceeds character limit', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      const longContent = 'a'.repeat(10001)
      await user.type(textarea, longContent)
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/10001\/10000/)).toBeInTheDocument()
      expect(screen.getByText(/reply too long/i)).toBeInTheDocument()
    })

    it('prevents submission of only whitespace', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, '   ')
      
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Reply Submission', () => {
    it('submits reply when form is submitted', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockResolvedValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      expect(mockStore.createReply).toHaveBeenCalledWith('post1', 'Test reply', undefined)
    })

    it('submits nested reply with parent ID', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockResolvedValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" parentId="1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Nested reply')
      await user.click(submitButton)
      
      expect(mockStore.createReply).toHaveBeenCalledWith('post1', 'Nested reply', '1')
    })

    it('clears form after successful submission', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockResolvedValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(textarea).toHaveValue('')
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock a delayed response
      let resolveSubmit: (value: any) => void
      mockStore.createReply.mockReturnValue(
        new Promise((resolve) => {
          resolveSubmit = resolve
        })
      )
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      expect(screen.getByRole('button', { name: /posting/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled()
      
      // Resolve the promise
      resolveSubmit!(mockParentReply)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /post reply/i })).toBeInTheDocument()
      })
    })

    it('shows error message when submission fails', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockRejectedValue(new Error('Failed to create reply'))
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('reply-create-error')).toBeInTheDocument()
        expect(screen.getByText(/failed to create reply/i)).toBeInTheDocument()
      })
    })

    it('retains form content when submission fails', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockRejectedValue(new Error('Failed to create reply'))
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(textarea).toHaveValue('Test reply')
      })
    })
  })

  describe('Reply Editing', () => {
    it('shows edit mode when editing a reply', () => {
      mockStore.getReplyById.mockReturnValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" editingReplyId="1" />)
      
      expect(screen.getByText(/edit reply/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update reply/i })).toBeInTheDocument()
    })

    it('pre-fills textarea with existing content when editing', () => {
      mockStore.getReplyById.mockReturnValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" editingReplyId="1" />)
      
      const textarea = screen.getByRole('textbox', { name: /edit reply/i })
      expect(textarea).toHaveValue('This is the parent reply')
    })

    it('submits update when in edit mode', async () => {
      const user = userEvent.setup()
      mockStore.getReplyById.mockReturnValue(mockParentReply)
      mockStore.updateReply.mockResolvedValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" editingReplyId="1" />)
      
      const textarea = screen.getByRole('textbox', { name: /edit reply/i })
      const updateButton = screen.getByRole('button', { name: /update reply/i })
      
      await user.clear(textarea)
      await user.type(textarea, 'Updated reply content')
      await user.click(updateButton)
      
      expect(mockStore.updateReply).toHaveBeenCalledWith('1', 'Updated reply content')
    })

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup()
      mockStore.getReplyById.mockReturnValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" editingReplyId="1" />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockStore.setEditingReply).toHaveBeenCalledWith(null)
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('submits form when Ctrl+Enter is pressed', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockResolvedValue(mockParentReply)
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.keyboard('{Control>}{Enter}{/Control}')
      
      expect(mockStore.createReply).toHaveBeenCalledWith('post1', 'Test reply', undefined)
    })

    it('cancels when Escape is pressed', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      
      render(<ReplyCreate postId="post1" parentId="1" onCancel={onCancel} />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      await user.type(textarea, 'Test reply')
      await user.keyboard('{Escape}')
      
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('clears error when user starts typing', async () => {
      const user = userEvent.setup()
      
      mockUseReplyStore.mockReturnValue({
        ...mockStore,
        error: 'Previous error message'
      })
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      await user.type(textarea, 'New content')
      
      expect(mockStore.clearError).toHaveBeenCalled()
    })

    it('shows retry button when submission fails', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockRejectedValue(new Error('Network error'))
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('retries submission when retry button is clicked', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockRejectedValueOnce(new Error('Network error'))
      mockStore.createReply.mockResolvedValueOnce(mockParentReply)
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(mockStore.createReply).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('has proper labels and ARIA attributes', () => {
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      expect(textarea).toHaveAttribute('aria-label', 'Write a reply')
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count')
      expect(submitButton).toHaveAttribute('aria-describedby', 'submit-help')
    })

    it('announces character count to screen readers', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      await user.type(textarea, 'Test')
      
      expect(screen.getByTestId('char-count')).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByTestId('char-count')).toHaveTextContent('4/10000')
    })

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup()
      mockStore.createReply.mockRejectedValue(new Error('Failed to create reply'))
      
      render(<ReplyCreate postId="post1" />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const submitButton = screen.getByRole('button', { name: /post reply/i })
      
      await user.type(textarea, 'Test reply')
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorElement = screen.getByTestId('reply-create-error')
        expect(errorElement).toHaveAttribute('aria-live', 'assertive')
        expect(errorElement).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Preview Mode', () => {
    it('shows preview toggle button', () => {
      render(<ReplyCreate postId="post1" enablePreview />)
      
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument()
    })

    it('switches to preview mode when preview button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" enablePreview />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const previewButton = screen.getByRole('button', { name: /preview/i })
      
      await user.type(textarea, 'This is **bold** text')
      await user.click(previewButton)
      
      expect(screen.getByTestId('reply-preview')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('renders markdown in preview mode', async () => {
      const user = userEvent.setup()
      render(<ReplyCreate postId="post1" enablePreview />)
      
      const textarea = screen.getByRole('textbox', { name: /write a reply/i })
      const previewButton = screen.getByRole('button', { name: /preview/i })
      
      await user.type(textarea, 'This is **bold** text')
      await user.click(previewButton)
      
      const preview = screen.getByTestId('reply-preview')
      expect(preview).toContainHTML('<strong>bold</strong>')
    })
  })
})