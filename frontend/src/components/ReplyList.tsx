import { useEffect, useState } from 'react'
import { useReplyStore } from '../stores/replyStore'
import { Reply } from '../types'
import './ReplyList.css'

interface ReplyListProps {
  postId: string
  currentUserId?: string
  virtualized?: boolean
}

const ReplyList: React.FC<ReplyListProps> = ({ 
  postId, 
  currentUserId,
  virtualized = false 
}) => {
  const {
    replies,
    loading,
    error,
    fetchReplies,
    deleteReply,
    toggleThread,
    isThreadExpanded,
    getRepliesByParent,
    getReplyChildren,
    setReplyingTo,
    setEditingReply,
    clearReplies,
    clearError
  } = useReplyStore()

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [focusedReply, setFocusedReply] = useState<string | null>(null)
  const [expandingThreads, setExpandingThreads] = useState<Set<string>>(new Set())
  const [srAnnouncement, setSrAnnouncement] = useState<string>('')

  useEffect(() => {
    fetchReplies(postId, true)
    
    return () => {
      clearReplies()
    }
  }, [postId, fetchReplies, clearReplies])

  const handleRetry = () => {
    clearError()
    fetchReplies(postId, true)
  }

  const handleReply = (replyId: string) => {
    setReplyingTo(replyId)
  }

  const handleEdit = (replyId: string) => {
    setEditingReply(replyId)
  }

  const handleDelete = (replyId: string) => {
    setDeleteConfirmId(replyId)
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteReply(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleToggleThread = (replyId: string) => {
    const wasExpanded = isThreadExpanded(replyId)
    const childCount = getReplyChildren(replyId).length
    
    // Add expanding animation state
    setExpandingThreads(prev => new Set([...prev, replyId]))
    
    // Remove animation state after transition
    setTimeout(() => {
      setExpandingThreads(prev => {
        const newSet = new Set(prev)
        newSet.delete(replyId)
        return newSet
      })
    }, 300)
    
    toggleThread(replyId)
    
    // Update screen reader announcement
    const newState = wasExpanded ? 'collapsed' : 'expanded'
    const announcement = `Thread ${newState}, ${wasExpanded ? 'hiding' : 'showing'} ${childCount} ${childCount === 1 ? 'reply' : 'replies'}`
    setSrAnnouncement(announcement)
    
    // Clear announcement after delay
    setTimeout(() => setSrAnnouncement(''), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent, replyId: string) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const currentIndex = replies.findIndex(r => r.id === replyId)
      const nextReply = replies[currentIndex + 1]
      if (nextReply) {
        setFocusedReply(nextReply.id)
        const element = document.getElementById(`reply-${nextReply.id}`)
        element?.focus()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const currentIndex = replies.findIndex(r => r.id === replyId)
      const prevReply = replies[currentIndex - 1]
      if (prevReply) {
        setFocusedReply(prevReply.id)
        const element = document.getElementById(`reply-${prevReply.id}`)
        element?.focus()
      }
    }
  }

  const handleExpandKeyDown = (e: React.KeyboardEvent, replyId: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleToggleThread(replyId)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderReply = (reply: Reply) => {
    const hasChildren = getReplyChildren(reply.id).length > 0
    const childCount = getReplyChildren(reply.id).length
    const isExpanded = isThreadExpanded(reply.id)
    const isOwner = currentUserId === reply.author_id
    const shouldShowChildren = hasChildren && isExpanded
    const isExpanding = expandingThreads.has(reply.id)
    const isMaxDepth = reply.depth >= 10 || !reply.can_reply_to

    return (
      <div key={reply.id} className="reply-thread">
        <div
          id={`reply-${reply.id}`}
          className={`reply reply-depth-${reply.depth}`}
          data-testid={`reply-${reply.id}`}
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, reply.id)}
        >
          <div className="reply-content">
            <div className="reply-meta">
              <span className="reply-author">{reply.author_id}</span>
              <span className="reply-time">{formatTime(reply.created_at)}</span>
              {reply.is_edited && (
                <span className="reply-edited" data-testid={`edited-indicator-${reply.id}`}>
                  edited
                </span>
              )}
              {!reply.can_reply_to && (
                <span className="reply-max-depth" data-testid={`max-depth-indicator-${reply.id}`}>
                  max depth
                </span>
              )}
            </div>
            
            <div className="reply-text">
              {reply.content}
            </div>
            
            <div className="reply-actions">
              <div className="reply-votes">
                <span className="vote-count">{reply.net_votes}</span>
              </div>
              
              <div className="reply-buttons">
                {hasChildren && (
                  <button
                    className={`expand-button ${isExpanding ? 'expanding' : ''}`}
                    data-testid={`expand-button-${reply.id}`}
                    onClick={() => handleToggleThread(reply.id)}
                    onKeyDown={(e) => handleExpandKeyDown(e, reply.id)}
                    aria-label={isExpanded ? 'Collapse thread' : 'Expand thread'}
                    aria-expanded={isExpanded}
                    aria-controls={`thread-${reply.id}`}
                    title={`${isExpanded ? 'Collapse' : 'Expand'} thread with ${childCount} ${childCount === 1 ? 'reply' : 'replies'}`}
                  >
                    <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                    <span className="child-count">{childCount}</span>
                  </button>
                )}
                
                <button
                  className="reply-button"
                  data-testid={`reply-button-${reply.id}`}
                  onClick={() => handleReply(reply.id)}
                  aria-label="Reply to this comment"
                >
                  Reply
                </button>
                
                {isOwner && (
                  <>
                    <button
                      className="edit-button"
                      data-testid={`edit-button-${reply.id}`}
                      onClick={() => handleEdit(reply.id)}
                      aria-label="Edit this reply"
                    >
                      Edit
                    </button>
                    
                    <button
                      className="delete-button"
                      data-testid={`delete-button-${reply.id}`}
                      onClick={() => handleDelete(reply.id)}
                      aria-label="Delete this reply"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {shouldShowChildren && (
          <div 
            className={`reply-children ${isExpanding ? 'expanding' : ''}`}
            id={`thread-${reply.id}`}
            role="group"
            aria-label={`Replies to ${reply.author_id}'s comment`}
          >
            {getReplyChildren(reply.id).map(renderReply)}
          </div>
        )}
      </div>
    )
  }

  const renderVirtualizedList = () => {
    return (
      <div className="virtualized-reply-list" data-testid="virtualized-reply-list">
        {replies.map(renderReply)}
      </div>
    )
  }

  if (loading && replies.length === 0) {
    return (
      <div className="reply-list-loading" data-testid="reply-list-loading">
        Loading replies...
      </div>
    )
  }

  if (error) {
    return (
      <div className="reply-list-error" data-testid="reply-list-error">
        <p>Failed to load replies</p>
        <button onClick={handleRetry} data-testid="retry-button">
          Retry
        </button>
      </div>
    )
  }

  if (replies.length === 0) {
    return (
      <div className="reply-list-empty" data-testid="reply-list-empty">
        <p>No replies yet</p>
        <p>Be the first to reply to this post</p>
      </div>
    )
  }

  const rootReplies = getRepliesByParent(undefined)

  return (
    <div className="reply-list-container" data-testid="reply-list-container">
      <div 
        className="reply-list"
        role="list"
        aria-label="Replies"
      >
        {virtualized ? renderVirtualizedList() : rootReplies.map(renderReply)}
      </div>
      
      {deleteConfirmId && (
        <div className="delete-confirmation-modal" data-testid="delete-confirmation">
          <div className="modal-content">
            <p>Delete this reply?</p>
            <div className="modal-actions">
              <button 
                onClick={confirmDelete}
                data-testid="confirm-delete"
              >
                Delete
              </button>
              <button onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className="sr-only" 
        data-testid="sr-announcement"
        aria-live="polite"
      >
        {srAnnouncement}
      </div>
    </div>
  )
}

export default ReplyList