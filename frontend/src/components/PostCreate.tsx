import { useState, useEffect } from 'react'
import { usePostStore, useChannelStore } from '../stores'
import { Post } from '../types'
import './PostCreate.css'

interface PostCreateProps {
  onPostCreated?: (post: Post) => void
}

interface FormData {
  title: string
  content: string
}

interface FormErrors {
  title?: string
  content?: string
}

function PostCreate({ onPostCreated }: PostCreateProps) {
  const { 
    loading, 
    error, 
    createPost, 
    setError 
  } = usePostStore()
  const { currentChannel } = useChannelStore()
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Clear error when user starts typing
  useEffect(() => {
    if (error && (formData.title || formData.content)) {
      setError(null)
    }
  }, [formData.title, formData.content, error, setError])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required'
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters'
    } else if (formData.content.length > 1000) {
      newErrors.content = 'Content must be less than 1000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear success message when user starts editing
    if (successMessage) {
      setSuccessMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentChannel) {
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim()
      }

      const newPost = await createPost(currentChannel.id, postData)
      
      // Clear form on success
      setFormData({ title: '', content: '' })
      setErrors({})
      setSuccessMessage('Post created successfully!')
      
      // Call callback if provided
      if (onPostCreated) {
        onPostCreated(newPost)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
      
    } catch (error) {
      // Error is handled by the store
      console.error('Error creating post:', error)
    }
  }

  const handleRetry = () => {
    setError(null)
    handleSubmit(new Event('submit') as any)
  }

  if (!currentChannel) {
    return (
      <div className="post-create">
        <div className="post-create__no-channel">
          <h3>Create New Post</h3>
          <p>Please select a channel first to create a post.</p>
        </div>
      </div>
    )
  }

  const isFormValid = formData.title.length > 0 && 
                     formData.content.length > 0 && 
                     formData.title.length <= 100 && 
                     formData.content.length <= 1000 && 
                     Object.keys(errors).length === 0

  const isNetworkError = error?.includes('Network') || error?.includes('network')

  return (
    <div className="post-create">
      <div className="post-create__header">
        <h3>Create New Post</h3>
        <p className="post-create__channel">Posting in #{currentChannel.name}</p>
      </div>

      {successMessage && (
        <div className="post-create__success" data-testid="post-create-success">
          <p className="success-message">{successMessage}</p>
        </div>
      )}

      {error && (
        <div 
          className={`post-create__error ${isNetworkError ? 'post-create__error--network' : ''}`}
          data-testid="post-create-error"
        >
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={handleRetry}
            type="button"
          >
            Try Again
          </button>
        </div>
      )}

      <form className="post-create__form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="post-title" className="form-label">
            Title
          </label>
          <input
            id="post-title"
            type="text"
            className={`form-input ${errors.title ? 'form-input--error' : ''}`}
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter post title..."
            maxLength={100}
            disabled={loading}
          />
          <div className="form-meta">
            <span className="character-count">{formData.title.length}/100</span>
          </div>
          {errors.title && (
            <span className="form-error">{errors.title}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="post-content" className="form-label">
            Content
          </label>
          <textarea
            id="post-content"
            className={`form-textarea ${errors.content ? 'form-input--error' : ''}`}
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="What would you like to discuss?"
            rows={6}
            maxLength={1000}
            disabled={loading}
          />
          <div className="form-meta">
            <span className="character-count">{formData.content.length}/1000</span>
          </div>
          {errors.content && (
            <span className="form-error">{errors.content}</span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!isFormValid || loading}
          >
            {loading ? 'Creating Post...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostCreate