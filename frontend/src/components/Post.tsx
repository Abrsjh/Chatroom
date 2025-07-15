import { Link } from 'react-router-dom'
import { Post as PostType } from '../types'
import './Post.css'

interface PostProps {
  post: PostType
  compact?: boolean
}

function Post({ post, compact = false }: PostProps) {
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const isEdited = post.updated_at.getTime() !== post.created_at.getTime()

  return (
    <article 
      className={`post-item ${compact ? 'post-item--compact' : ''}`}
      data-testid="post-item"
    >
      <Link 
        to={`/posts/${post.id}`}
        className="post-item__link"
      >
        <div className="post-item__content">
          <h3 className="post-item__title">{post.title}</h3>
          
          <div className="post-item__metadata" data-testid="post-metadata">
            <span className="post-item__author">by {post.user_id}</span>
            <span className="post-item__separator">•</span>
            <span className="post-item__time">
              {formatRelativeTime(post.created_at)}
              {isEdited && <span className="post-item__edited"> (edited)</span>}
            </span>
          </div>

          {!compact && (
            <div className="post-item__text" data-testid="post-content">
              {post.content.length > 200 
                ? `${post.content.substring(0, 200)}...` 
                : post.content
              }
            </div>
          )}
        </div>
      </Link>
    </article>
  )
}

export default Post