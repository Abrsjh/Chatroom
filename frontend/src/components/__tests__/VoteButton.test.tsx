import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useVoteStore } from '../../stores/voteStore'
import VoteButton from '../VoteButton'

// Mock the vote store
vi.mock('../../stores/voteStore')
const mockUseVoteStore = vi.mocked(useVoteStore)

describe('VoteButton Component', () => {
  const mockVoteOnPost = vi.fn()
  const mockVoteOnReply = vi.fn()
  const mockGetUserVote = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseVoteStore.mockReturnValue({
      loading: false,
      error: null,
      userVotes: new Map(),
      voteOnPost: mockVoteOnPost,
      voteOnReply: mockVoteOnReply,
      getUserVote: mockGetUserVote,
      clearError: mockClearError,
      getVoteCounts: vi.fn(),
      refreshVoteCounts: vi.fn()
    })
  })

  describe('Post Voting', () => {
    it('should render upvote and downvote buttons for post', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
          disabled={false}
        />
      )

      expect(screen.getByTestId('upvote-button')).toBeInTheDocument()
      expect(screen.getByTestId('downvote-button')).toBeInTheDocument()
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument()
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument()
    })

    it('should call voteOnPost when upvote button is clicked', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnPost.mockResolvedValue({ vote_type: 'upvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'upvote', 'user1')
      })
    })

    it('should call voteOnPost when downvote button is clicked', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnPost.mockResolvedValue({ vote_type: 'downvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const downvoteButton = screen.getByTestId('downvote-button')
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'downvote', 'user1')
      })
    })

    it('should show active state for upvoted post', () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'upvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      const downvoteButton = screen.getByTestId('downvote-button')

      expect(upvoteButton).toHaveClass('active')
      expect(downvoteButton).not.toHaveClass('active')
    })

    it('should show active state for downvoted post', () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'downvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      const downvoteButton = screen.getByTestId('downvote-button')

      expect(upvoteButton).not.toHaveClass('active')
      expect(downvoteButton).toHaveClass('active')
    })
  })

  describe('Reply Voting', () => {
    it('should render upvote and downvote buttons for reply', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="reply" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByTestId('upvote-button')).toBeInTheDocument()
      expect(screen.getByTestId('downvote-button')).toBeInTheDocument()
    })

    it('should call voteOnReply when upvote button is clicked', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnReply.mockResolvedValue({ vote_type: 'upvote' })

      render(
        <VoteButton 
          targetType="reply" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(mockVoteOnReply).toHaveBeenCalledWith('1', 'upvote', 'user1')
      })
    })

    it('should call voteOnReply when downvote button is clicked', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnReply.mockResolvedValue({ vote_type: 'downvote' })

      render(
        <VoteButton 
          targetType="reply" 
          targetId="1" 
          userId="user1" 
        />
      )

      const downvoteButton = screen.getByTestId('downvote-button')
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(mockVoteOnReply).toHaveBeenCalledWith('1', 'downvote', 'user1')
      })
    })
  })

  describe('Vote Removal', () => {
    it('should remove upvote when clicking upvote again', async () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'upvote' })
      mockVoteOnPost.mockResolvedValue({ message: 'Vote removed' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'upvote', 'user1')
      })
    })

    it('should remove downvote when clicking downvote again', async () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'downvote' })
      mockVoteOnPost.mockResolvedValue({ message: 'Vote removed' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const downvoteButton = screen.getByTestId('downvote-button')
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'downvote', 'user1')
      })
    })

    it('should change from upvote to downvote', async () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'upvote' })
      mockVoteOnPost.mockResolvedValue({ vote_type: 'downvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const downvoteButton = screen.getByTestId('downvote-button')
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'downvote', 'user1')
      })
    })
  })

  describe('Loading States', () => {
    it('should disable buttons when loading', () => {
      mockUseVoteStore.mockReturnValue({
        loading: true,
        error: null,
        userVotes: new Map(),
        voteOnPost: mockVoteOnPost,
        voteOnReply: mockVoteOnReply,
        getUserVote: mockGetUserVote,
        clearError: mockClearError,
        getVoteCounts: vi.fn(),
        refreshVoteCounts: vi.fn()
      })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByTestId('upvote-button')).toBeDisabled()
      expect(screen.getByTestId('downvote-button')).toBeDisabled()
    })

    it('should show loading indicator during vote operation', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnPost.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ vote_type: 'upvote' }), 100)
      ))

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      expect(screen.getByTestId('vote-loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByTestId('vote-loading')).not.toBeInTheDocument()
      })
    })

    it('should disable buttons when explicitly disabled', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
          disabled={true}
        />
      )

      expect(screen.getByTestId('upvote-button')).toBeDisabled()
      expect(screen.getByTestId('downvote-button')).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when vote fails', async () => {
      mockUseVoteStore.mockReturnValue({
        loading: false,
        error: 'Failed to vote on post',
        userVotes: new Map(),
        voteOnPost: mockVoteOnPost,
        voteOnReply: mockVoteOnReply,
        getUserVote: mockGetUserVote,
        clearError: mockClearError,
        getVoteCounts: vi.fn(),
        refreshVoteCounts: vi.fn()
      })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByTestId('vote-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to vote on post')).toBeInTheDocument()
    })

    it('should clear error when retry button is clicked', () => {
      mockUseVoteStore.mockReturnValue({
        loading: false,
        error: 'Failed to vote on post',
        userVotes: new Map(),
        voteOnPost: mockVoteOnPost,
        voteOnReply: mockVoteOnReply,
        getUserVote: mockGetUserVote,
        clearError: mockClearError,
        getVoteCounts: vi.fn(),
        refreshVoteCounts: vi.fn()
      })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const retryButton = screen.getByTestId('retry-vote-button')
      fireEvent.click(retryButton)

      expect(mockClearError).toHaveBeenCalled()
    })

    it('should handle network errors gracefully', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnPost.mockRejectedValue(new Error('Network error'))

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(mockVoteOnPost).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByLabelText('Upvote')).toBeInTheDocument()
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument()
    })

    it('should update ARIA labels when vote state changes', () => {
      mockGetUserVote.mockReturnValue({ vote_type: 'upvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByLabelText('Remove upvote')).toBeInTheDocument()
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      const downvoteButton = screen.getByTestId('downvote-button')

      expect(upvoteButton).toHaveAttribute('tabIndex', '0')
      expect(downvoteButton).toHaveAttribute('tabIndex', '0')
    })

    it('should support keyboard navigation', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      
      fireEvent.keyDown(upvoteButton, { key: 'Enter' })
      expect(mockVoteOnPost).toHaveBeenCalledWith('1', 'upvote', 'user1')

      fireEvent.keyDown(upvoteButton, { key: ' ' })
      expect(mockVoteOnPost).toHaveBeenCalledTimes(2)
    })
  })

  describe('Visual Feedback', () => {
    it('should show hover effects on buttons', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      
      fireEvent.mouseEnter(upvoteButton)
      expect(upvoteButton).toHaveClass('hover')

      fireEvent.mouseLeave(upvoteButton)
      expect(upvoteButton).not.toHaveClass('hover')
    })

    it('should show active animations when voting', async () => {
      mockGetUserVote.mockReturnValue(null)
      mockVoteOnPost.mockResolvedValue({ vote_type: 'upvote' })

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      fireEvent.click(upvoteButton)

      expect(upvoteButton).toHaveClass('voting')

      await waitFor(() => {
        expect(upvoteButton).not.toHaveClass('voting')
      })
    })

    it('should display vote icons correctly', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(screen.getByTestId('upvote-icon')).toBeInTheDocument()
      expect(screen.getByTestId('downvote-icon')).toBeInTheDocument()
    })
  })

  describe('Props Validation', () => {
    it('should handle missing userId gracefully', () => {
      mockGetUserVote.mockReturnValue(null)

      render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      const downvoteButton = screen.getByTestId('downvote-button')

      expect(upvoteButton).toBeDisabled()
      expect(downvoteButton).toBeDisabled()
    })

    it('should handle invalid targetType gracefully', () => {
      mockGetUserVote.mockReturnValue(null)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <VoteButton 
          targetType="invalid" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid targetType')
      )

      consoleSpy.mockRestore()
    })

    it('should require targetId', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <VoteButton 
          targetType="post" 
          userId="user1" 
        />
      )

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should not re-render when vote counts change for different targets', () => {
      mockGetUserVote.mockReturnValue(null)
      
      const { rerender } = render(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      const upvoteButton = screen.getByTestId('upvote-button')
      const initialProps = upvoteButton.outerHTML

      // Simulate vote counts changing for a different post
      rerender(
        <VoteButton 
          targetType="post" 
          targetId="1" 
          userId="user1" 
        />
      )

      expect(upvoteButton.outerHTML).toBe(initialProps)
    })
  })
})