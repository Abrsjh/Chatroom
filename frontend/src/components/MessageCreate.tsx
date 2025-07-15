import { useState, useRef, useEffect } from 'react'
import { useMessageStore } from '../stores'
import './MessageCreate.css'

interface MessageCreateProps {
  otherUserId: string
}

const MessageCreate: React.FC<MessageCreateProps> = ({ otherUserId }) => {
  const {
    loading,
    error,
    sendMessage,
    clearError,
    isOtherUserTyping,
    isOffline
  } = useMessageStore()

  const [content, setContent] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const maxChars = 2000

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(40, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  useEffect(() => {
    // Save draft after user stops typing
    if (content.trim() && !isSending) {
      if (saveTimeout) clearTimeout(saveTimeout)
      
      const timeout = setTimeout(() => {
        // Mock draft saving - in real app this would save to localStorage or backend
        setLastSaved(new Date())
      }, 1000)
      
      setSaveTimeout(timeout)
    }
    
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
    }
  }, [content, isSending])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    setCharCount(value.length)
    
    // Clear error when user starts typing
    if (error) {
      clearError()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    const trimmed = content.trim()
    
    if (!trimmed || trimmed.length > maxChars || isSending || isOffline) {
      return
    }

    setIsSending(true)
    
    try {
      await sendMessage(otherUserId, trimmed)
      setContent('')
      setCharCount(0)
      setLastSaved(null)
    } catch (err) {
      // Error handling is done in the store
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleRetry = () => {
    handleSend()
  }

  const handleAttachFile = () => {
    setShowFilePicker(true)
  }

  const isDisabled = !content.trim() || content.length > maxChars || isSending || isOffline
  const isOverLimit = charCount > maxChars

  return (
    <div className="message-create">
      {isOtherUserTyping && (
        <div className="typing-indicator" data-testid="typing-indicator">
          <span>User is typing...</span>
        </div>
      )}
      
      {error && (
        <div className="message-create-error" data-testid="message-create-error">
          <span>Failed to send message</span>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}
      
      {isOffline && (
        <div className="offline-indicator">
          You are offline. Messages will be sent when connection is restored.
        </div>
      )}
      
      <form className="message-form" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className={`message-input ${isOverLimit ? 'error' : ''}`}
            disabled={isOffline}
            aria-label="Type a message"
            rows={1}
          />
          
          <button
            type="button"
            onClick={handleAttachFile}
            className="attach-button"
            disabled={isOffline}
            aria-label="Attach file"
          >
            📎
          </button>
        </div>
        
        <div className="message-actions">
          <div className="message-meta">
            <span className={`char-count ${isOverLimit ? 'error' : ''}`}>
              {charCount}/{maxChars}
            </span>
            
            {isOverLimit && (
              <span className="error-text">Message too long</span>
            )}
            
            {lastSaved && !isSending && (
              <span className="draft-saved">Draft saved</span>
            )}
          </div>
          
          <button
            type="submit"
            className="send-button"
            disabled={isDisabled}
            aria-label={isSending ? 'Sending...' : 'Send'}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
      
      {showFilePicker && (
        <div className="file-picker" data-testid="file-picker">
          <div className="file-picker-content">
            <p>File attachment feature coming soon!</p>
            <button onClick={() => setShowFilePicker(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageCreate