import { useState, useEffect } from 'react'
import { useVoteStore } from '../stores/voteStore'
import { VoteType } from '../types'
import './VoteButton.css'

interface VoteButtonProps {
  targetType: 'post' | 'reply'
  targetId: string
  userId?: string
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
  className?: string
}

const VoteButton: React.FC<VoteButtonProps> = ({
  targetType,
  targetId,
  userId,
  disabled = false,
  size = 'medium',
  showLabels = false,
  className = ''
}) => {
  const {
    loading,
    error,
    voteOnPost,
    voteOnReply,
    getUserVote,
    clearError,
    refreshUserVote
  } = useVoteStore()

  const [isVoting, setIsVoting] = useState(false)
  const [hoverState, setHoverState] = useState<VoteType | null>(null)

  // Validate props
  useEffect(() => {
    if (!targetType || !['post', 'reply'].includes(targetType)) {
      console.error('Invalid targetType. Must be "post" or "reply"')
    }
    if (!targetId) {
      console.error('targetId is required')
    }
  }, [targetType, targetId])

  // Load user's current vote on mount
  useEffect(() => {
    if (userId && targetId && targetType) {
      refreshUserVote(targetType, targetId, userId)
    }
  }, [targetType, targetId, userId, refreshUserVote])

  const currentVote = userId ? getUserVote(targetType, targetId, userId) : null
  const isDisabled = disabled || loading || !userId || isVoting

  const handleVote = async (voteType: VoteType) => {
    if (isDisabled || !userId) return

    setIsVoting(true)
    clearError()

    try {
      if (targetType === 'post') {
        await voteOnPost(targetId, voteType, userId)
      } else {
        await voteOnReply(targetId, voteType, userId)
      }
    } catch (error) {
      console.error('Vote operation failed:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, voteType: VoteType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleVote(voteType)
    }
  }

  const isUpvoteActive = currentVote?.vote_type === 'upvote'
  const isDownvoteActive = currentVote?.vote_type === 'downvote'

  const getAriaLabel = (voteType: VoteType) => {
    const isActive = voteType === 'upvote' ? isUpvoteActive : isDownvoteActive
    const action = isActive ? 'Remove' : voteType === 'upvote' ? 'Upvote' : 'Downvote'
    
    if (isActive) {
      return voteType === 'upvote' ? 'Remove upvote' : 'Remove downvote'
    }
    return voteType === 'upvote' ? 'Upvote' : 'Downvote'
  }

  const getButtonClass = (voteType: VoteType) => {
    const baseClass = `vote-button vote-button-${voteType}`
    const sizeClass = `vote-button-${size}`
    const activeClass = (voteType === 'upvote' ? isUpvoteActive : isDownvoteActive) ? 'active' : ''
    const hoverClass = hoverState === voteType ? 'hover' : ''
    const votingClass = isVoting ? 'voting' : ''
    
    return [baseClass, sizeClass, activeClass, hoverClass, votingClass].filter(Boolean).join(' ')
  }

  if (!userId) {
    return (
      <div className={`vote-button-container disabled ${className}`}>
        <button
          className={getButtonClass('upvote')}
          disabled={true}
          aria-label="Login to vote"
          data-testid="upvote-button"
          tabIndex={0}
        >
          <span className="vote-icon" data-testid="upvote-icon">↑</span>
          {showLabels && <span className="vote-label">Up</span>}
        </button>
        <button
          className={getButtonClass('downvote')}
          disabled={true}
          aria-label="Login to vote"
          data-testid="downvote-button"
          tabIndex={0}
        >
          <span className="vote-icon" data-testid="downvote-icon">↓</span>
          {showLabels && <span className="vote-label">Down</span>}
        </button>
      </div>
    )
  }

  return (
    <div className={`vote-button-container ${className}`}>
      {/* Upvote Button */}
      <button
        className={getButtonClass('upvote')}
        onClick={() => handleVote('upvote')}
        onKeyDown={(e) => handleKeyDown(e, 'upvote')}
        onMouseEnter={() => setHoverState('upvote')}
        onMouseLeave={() => setHoverState(null)}
        disabled={isDisabled}
        aria-label={getAriaLabel('upvote')}
        data-testid="upvote-button"
        tabIndex={0}
      >
        <span className="vote-icon" data-testid="upvote-icon">↑</span>
        {showLabels && <span className="vote-label">Up</span>}
      </button>

      {/* Downvote Button */}
      <button
        className={getButtonClass('downvote')}
        onClick={() => handleVote('downvote')}
        onKeyDown={(e) => handleKeyDown(e, 'downvote')}
        onMouseEnter={() => setHoverState('downvote')}
        onMouseLeave={() => setHoverState(null)}
        disabled={isDisabled}
        aria-label={getAriaLabel('downvote')}
        data-testid="downvote-button"
        tabIndex={0}
      >
        <span className="vote-icon" data-testid="downvote-icon">↓</span>
        {showLabels && <span className="vote-label">Down</span>}
      </button>

      {/* Loading Indicator */}
      {isVoting && (
        <div className="vote-loading" data-testid="vote-loading">
          <span className="loading-spinner" aria-label="Voting..."></span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="vote-error" data-testid="vote-error" role="alert">
          <span className="error-message">{error}</span>
          <button 
            className="retry-button"
            onClick={clearError}
            data-testid="retry-vote-button"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default VoteButton