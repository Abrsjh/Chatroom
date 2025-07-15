import { useEffect, useMemo } from 'react'
import { useVoteStore } from '../stores/voteStore'
import { VoteCounts } from '../types'
import './VoteScore.css'

interface VoteScoreProps {
  targetType: 'post' | 'reply'
  targetId: string
  displayType?: 'net' | 'upvotes' | 'downvotes' | 'total'
  size?: 'small' | 'medium' | 'large'
  formatLargeNumbers?: boolean
  showIcon?: boolean
  className?: string
}

const VoteScore: React.FC<VoteScoreProps> = ({
  targetType,
  targetId,
  displayType = 'net',
  size = 'medium',
  formatLargeNumbers = true,
  showIcon = false,
  className = ''
}) => {
  const {
    loading,
    error,
    getVoteCounts,
    refreshVoteCounts
  } = useVoteStore()

  // Refresh vote counts on mount and when target changes
  useEffect(() => {
    if (targetId && targetType) {
      refreshVoteCounts(targetType, targetId)
    }
  }, [targetType, targetId, refreshVoteCounts])

  const voteCounts = getVoteCounts(targetType, targetId)

  // Memoize the formatted number to avoid recalculation
  const formattedScore = useMemo(() => {
    if (!voteCounts) return null

    let score: number
    switch (displayType) {
      case 'upvotes':
        score = voteCounts.upvote_count
        break
      case 'downvotes':
        score = voteCounts.downvote_count
        break
      case 'total':
        score = voteCounts.total_votes
        break
      case 'net':
      default:
        score = voteCounts.net_votes
        break
    }

    if (!formatLargeNumbers) {
      return score.toString()
    }

    // Format large numbers with suffixes
    if (Math.abs(score) >= 1000000) {
      return (score / 1000000).toFixed(1) + 'M'
    } else if (Math.abs(score) >= 1000) {
      return (score / 1000).toFixed(1) + 'k'
    }
    
    return score.toString()
  }, [voteCounts, displayType, formatLargeNumbers])

  // Determine styling class based on score
  const getScoreClass = () => {
    if (!voteCounts) return 'neutral'
    
    const score = displayType === 'net' ? voteCounts.net_votes : 
                  displayType === 'upvotes' ? voteCounts.upvote_count :
                  displayType === 'downvotes' ? voteCounts.downvote_count :
                  voteCounts.total_votes

    if (displayType === 'net') {
      if (score > 0) return 'positive'
      if (score < 0) return 'negative'
      return 'neutral'
    }
    
    // For non-net displays, use neutral styling
    return 'neutral'
  }

  // Get ARIA label for accessibility
  const getAriaLabel = () => {
    if (!voteCounts) return 'Loading vote score'

    const score = displayType === 'net' ? voteCounts.net_votes : 
                  displayType === 'upvotes' ? voteCounts.upvote_count :
                  displayType === 'downvotes' ? voteCounts.downvote_count :
                  voteCounts.total_votes

    const label = displayType === 'net' ? 'Net score' :
                  displayType === 'upvotes' ? 'Upvotes' :
                  displayType === 'downvotes' ? 'Downvotes' :
                  'Total votes'

    const unit = displayType === 'net' ? 'votes' :
                 displayType === 'total' ? 'votes' : ''

    return `${label}: ${score}${unit ? ' ' + unit : ''}`
  }

  const scoreClass = `vote-score ${getScoreClass()} size-${size} ${className}`.trim()

  // Loading state
  if (loading) {
    return (
      <div className={`vote-score-loading ${scoreClass}`} data-testid="vote-score-loading">
        <span className="loading-dots" aria-label="Loading vote score">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div 
        className={`vote-score-error ${scoreClass}`} 
        data-testid="vote-score-error"
        aria-label="Error loading vote score"
      >
        <span className="error-icon">⚠</span>
        <span className="error-text">Error</span>
      </div>
    )
  }

  // No data state
  if (!voteCounts || formattedScore === null) {
    return (
      <div 
        className={`vote-score-placeholder ${scoreClass}`} 
        data-testid="vote-score-placeholder"
        aria-label="Vote score not available"
      >
        <span className="placeholder-text">-</span>
      </div>
    )
  }

  return (
    <div 
      className={scoreClass}
      data-testid="vote-score"
      aria-label={getAriaLabel()}
      role="status"
      aria-live="polite"
    >
      {showIcon && (
        <span className="score-icon">
          {displayType === 'upvotes' && '↑'}
          {displayType === 'downvotes' && '↓'}
          {displayType === 'net' && (voteCounts.net_votes >= 0 ? '▲' : '▼')}
          {displayType === 'total' && '●'}
        </span>
      )}
      <span className="score-value">{formattedScore}</span>
      {displayType === 'net' && voteCounts.net_votes !== 0 && (
        <span className="score-trend">
          {voteCounts.net_votes > 0 ? '+' : ''}
        </span>
      )}
    </div>
  )
}

export default VoteScore