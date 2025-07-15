import { useState, useEffect, useRef } from 'react'
import { useReplyStore } from '../stores/replyStore'
import './ReplyCreate.css'

interface ReplyCreateProps {
  postId: string
  parentId?: string
  editingReplyId?: string
  enablePreview?: boolean
  onCancel?: () => void
}

const ReplyCreate: React.FC<ReplyCreateProps> = ({
  postId,
  parentId,
  editingReplyId,
  enablePreview = false,
  onCancel
}) => {
  const {
    loading,
    error,
    createReply,
    updateReply,
    getReplyById,
    setEditingReply,
    clearError
  } = useReplyStore()

  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isEditing = Boolean(editingReplyId)
  const parentReply = parentId ? getReplyById(parentId) : null
  const editingReply = editingReplyId ? getReplyById(editingReplyId) : null
  const maxChars = 10000

  useEffect(() => {
    if (isEditing && editingReply) {
      setContent(editingReply.content)
      setCharCount(editingReply.content.length)
    }
  }, [isEditing, editingReply])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(40, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    setCharCount(value.length)
    
    if (error) {
      clearError()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleSubmit = async () => {
    const trimmedContent = content.trim()
    
    if (!trimmedContent || trimmedContent.length > maxChars || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    
    try {
      if (isEditing && editingReplyId) {
        await updateReply(editingReplyId, trimmedContent)
      } else {
        await createReply(postId, trimmedContent, parentId)
      }
      
      // Reset form
      setContent('')
      setCharCount(0)
      setShowPreview(false)
    } catch (error) {
      console.error('Failed to submit reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isEditing) {
      setEditingReply(null)
    }
    
    if (onCancel) {
      onCancel()
    }
    
    setContent('')
    setCharCount(0)
    setShowPreview(false)
  }

  const handleRetry = () => {
    handleSubmit()
  }

  const isOverLimit = charCount > maxChars
  const isEmpty = !content.trim()
  const canSubmit = !isEmpty && !isOverLimit && !isSubmitting

  const renderPreview = () => {
    // Simple markdown-like preview (in real app, use a proper markdown parser)
    const htmlContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
    
    return (
      <div 
        className="reply-preview"
        data-testid="reply-preview"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  return (
    <div className="reply-create">
      {parentReply && (
        <div className="parent-reply-context" data-testid="parent-reply-context">
          <div className="context-header">
            <span>Replying to:</span>
          </div>
          <div className="context-content">
            {parentReply.content}
          </div>
        </div>
      )}
      
      <form 
        className="reply-create-form"
        data-testid="reply-create-form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      >
        <div className="form-header">
          <h3>{isEditing ? 'Edit Reply' : 'Write a Reply'}</h3>
          
          {enablePreview && (
            <div className="preview-toggle">
              <button
                type="button"
                className={`preview-btn ${showPreview ? 'active' : ''}`}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
          )}
        </div>
        
        {showPreview ? (
          renderPreview()
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={isEditing ? "Edit your reply..." : "Write your reply..."}
            className={`reply-textarea ${isOverLimit ? 'error' : ''}`}
            disabled={isSubmitting}
            aria-label={isEditing ? "Edit reply" : "Write a reply"}
            aria-describedby="char-count"
            rows={1}
          />
        )}
        
        <div className="form-footer">
          <div className="form-meta">
            <span 
              className={`char-count ${isOverLimit ? 'error' : ''}`}
              data-testid="char-count"
              id="char-count"
              aria-live="polite"
            >
              {charCount}/{maxChars}
            </span>
            
            {isOverLimit && (
              <span className="error-text">Reply too long</span>
            )}
          </div>
          
          <div className="form-actions">
            {(parentId || isEditing) && (
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              className="submit-button"
              disabled={!canSubmit}
              aria-describedby="submit-help"
            >
              {isSubmitting ? 'Posting...' : isEditing ? 'Update Reply' : 'Post Reply'}
            </button>
          </div>
        </div>
        
        <div id="submit-help" className="sr-only">
          Press Ctrl+Enter to submit, Escape to cancel
        </div>
      </form>
      
      {error && (
        <div 
          className="reply-create-error"
          data-testid="reply-create-error"
          role="alert"
          aria-live="assertive"
        >
          <span>{error}</span>
          <button
            type="button"
            className="retry-button"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export default ReplyCreate