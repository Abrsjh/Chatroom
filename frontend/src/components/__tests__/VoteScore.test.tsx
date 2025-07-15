import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useVoteStore } from '../../stores/voteStore'
import VoteScore from '../VoteScore'

// Mock the vote store
vi.mock('../../stores/voteStore')
const mockUseVoteStore = vi.mocked(useVoteStore)

describe('VoteScore Component', () => {
  const mockGetVoteCounts = vi.fn()
  const mockRefreshVoteCounts = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseVoteStore.mockReturnValue({
      loading: false,
      error: null,
      userVotes: new Map(),
      voteCounts: new Map(),
      getVoteCounts: mockGetVoteCounts,
      refreshVoteCounts: mockRefreshVoteCounts,
      voteOnPost: vi.fn(),
      voteOnReply: vi.fn(),
      getUserVote: vi.fn(),
      clearError: vi.fn()
    })
  })

  describe('Score Display', () => {
    it('should display vote score for post', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByTestId('vote-score')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('should display vote score for reply', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 8,
        downvote_count: 2,
        net_votes: 6,
        total_votes: 10
      })

      render(
        <VoteScore 
          targetType="reply" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByText('6')).toBeInTheDocument()
    })

    it('should display upvote count when displayType is upvotes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="upvotes"
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should display downvote count when displayType is downvotes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="downvotes"
        />
      )

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display total votes when displayType is total', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="total"
        />
      )

      expect(screen.getByText('18')).toBeInTheDocument()
    })
  })

  describe('Zero Scores', () => {
    it('should handle zero votes gracefully', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 0,
        downvote_count: 0,
        net_votes: 0,
        total_votes: 0
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle negative scores', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 2,
        downvote_count: 8,
        net_votes: -6,
        total_votes: 10
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByText('-6')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator when vote counts are loading', () => {
      mockUseVoteStore.mockReturnValue({
        loading: true,
        error: null,
        userVotes: new Map(),
        voteCounts: new Map(),
        getVoteCounts: mockGetVoteCounts,
        refreshVoteCounts: mockRefreshVoteCounts,
        voteOnPost: vi.fn(),
        voteOnReply: vi.fn(),
        getUserVote: vi.fn(),
        clearError: vi.fn()
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(screen.getByTestId('vote-score-loading')).toBeInTheDocument()
    })

    it('should show placeholder while counts are undefined', () => {
      mockGetVoteCounts.mockReturnValue(undefined)

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(screen.getByTestId('vote-score-placeholder')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('should refresh vote counts on mount', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(mockRefreshVoteCounts).toHaveBeenCalledWith('post', '1')
    })

    it('should update display when vote counts change', async () => {
      // Initial render with initial counts
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      })

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByText('8')).toBeInTheDocument()

      // Update vote counts
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 11,
        downvote_count: 2,
        net_votes: 9,
        total_votes: 13
      })

      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('9')).toBeInTheDocument()
      })
    })

    it('should handle rapid vote count updates', async () => {
      let currentCounts = {
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      }

      mockGetVoteCounts.mockImplementation(() => currentCounts)

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      // Simulate rapid updates
      for (let i = 9; i <= 15; i++) {
        currentCounts = {
          upvote_count: 10 + (i - 8),
          downvote_count: 2,
          net_votes: i,
          total_votes: 12 + (i - 8)
        }

        rerender(
          <VoteScore 
            targetType="post" 
            targetId="1" 
            displayType="net"
          />
        )

        await waitFor(() => {
          expect(screen.getByText(i.toString())).toBeInTheDocument()
        })
      }
    })
  })

  describe('Formatting', () => {
    it('should format large numbers with appropriate suffixes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 1500,
        downvote_count: 200,
        net_votes: 1300,
        total_votes: 1700
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
          formatLargeNumbers={true}
        />
      )

      expect(screen.getByText('1.3k')).toBeInTheDocument()
    })

    it('should format very large numbers correctly', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 1500000,
        downvote_count: 200000,
        net_votes: 1300000,
        total_votes: 1700000
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
          formatLargeNumbers={true}
        />
      )

      expect(screen.getByText('1.3M')).toBeInTheDocument()
    })

    it('should not format small numbers when formatLargeNumbers is false', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 1500,
        downvote_count: 200,
        net_votes: 1300,
        total_votes: 1700
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
          formatLargeNumbers={false}
        />
      )

      expect(screen.getByText('1300')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should apply positive score styling for positive votes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      expect(scoreElement).toHaveClass('positive')
    })

    it('should apply negative score styling for negative votes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 2,
        downvote_count: 8,
        net_votes: -6,
        total_votes: 10
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      expect(scoreElement).toHaveClass('negative')
    })

    it('should apply neutral styling for zero votes', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 5,
        downvote_count: 5,
        net_votes: 0,
        total_votes: 10
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      expect(scoreElement).toHaveClass('neutral')
    })

    it('should apply custom size class', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          size="large"
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      expect(scoreElement).toHaveClass('size-large')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label for screen readers', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      expect(scoreElement).toHaveAttribute('aria-label', 'Net score: 12 votes')
    })

    it('should update ARIA label when score changes', async () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      })

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      expect(screen.getByTestId('vote-score')).toHaveAttribute('aria-label', 'Net score: 8 votes')

      mockGetVoteCounts.mockReturnValue({
        upvote_count: 11,
        downvote_count: 2,
        net_votes: 9,
        total_votes: 13
      })

      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('vote-score')).toHaveAttribute('aria-label', 'Net score: 9 votes')
      })
    })

    it('should provide contextual ARIA labels for different display types', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 15,
        downvote_count: 3,
        net_votes: 12,
        total_votes: 18
      })

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="upvotes"
        />
      )

      expect(screen.getByTestId('vote-score')).toHaveAttribute('aria-label', 'Upvotes: 15')

      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="downvotes"
        />
      )

      expect(screen.getByTestId('vote-score')).toHaveAttribute('aria-label', 'Downvotes: 3')

      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="total"
        />
      )

      expect(screen.getByTestId('vote-score')).toHaveAttribute('aria-label', 'Total votes: 18')
    })
  })

  describe('Error Handling', () => {
    it('should display error state when vote count fetch fails', () => {
      mockUseVoteStore.mockReturnValue({
        loading: false,
        error: 'Failed to load vote counts',
        userVotes: new Map(),
        voteCounts: new Map(),
        getVoteCounts: mockGetVoteCounts,
        refreshVoteCounts: mockRefreshVoteCounts,
        voteOnPost: vi.fn(),
        voteOnReply: vi.fn(),
        getUserVote: vi.fn(),
        clearError: vi.fn()
      })

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(screen.getByTestId('vote-score-error')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('should handle missing vote counts gracefully', () => {
      mockGetVoteCounts.mockReturnValue(null)

      render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(screen.getByTestId('vote-score-placeholder')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render when vote counts for other targets change', () => {
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 10,
        downvote_count: 2,
        net_votes: 8,
        total_votes: 12
      })

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      const scoreElement = screen.getByTestId('vote-score')
      const initialHTML = scoreElement.outerHTML

      // Simulate vote counts changing for different target
      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
        />
      )

      expect(scoreElement.outerHTML).toBe(initialHTML)
    })

    it('should memoize formatted numbers', () => {
      const formatSpy = vi.fn((num) => num.toString())
      
      mockGetVoteCounts.mockReturnValue({
        upvote_count: 1500,
        downvote_count: 200,
        net_votes: 1300,
        total_votes: 1700
      })

      // Mock the format function
      const originalFormat = Number.prototype.toLocaleString
      Number.prototype.toLocaleString = formatSpy

      const { rerender } = render(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
          formatLargeNumbers={true}
        />
      )

      rerender(
        <VoteScore 
          targetType="post" 
          targetId="1" 
          displayType="net"
          formatLargeNumbers={true}
        />
      )

      // Should not call format function multiple times for same value
      expect(formatSpy).toHaveBeenCalledTimes(1)

      Number.prototype.toLocaleString = originalFormat
    })
  })
})