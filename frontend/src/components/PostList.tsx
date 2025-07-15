import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePostStore } from '../stores'
import { PostSortType } from '../types'
import Post from './Post'
import './PostList.css'

interface PostListProps {
  channelId: string
  compact?: boolean
  showCreateLink?: boolean
}

function PostList({ channelId, compact = false, showCreateLink = false }: PostListProps) {
  const { 
    getSortedPosts, 
    loading, 
    error, 
    sortType, 
    timeWindow, 
    setSortType, 
    setTimeWindow 
  } = usePostStore()
  
  const [sortChangeAnnouncement, setSortChangeAnnouncement] = useState('')
  
  const posts = useMemo(() => {
    return getSortedPosts(channelId, sortType, timeWindow)
  }, [channelId, getSortedPosts, sortType, timeWindow])

  const handleSortChange = (newSortType: PostSortType) => {
    setSortType(newSortType)
    setSortChangeAnnouncement(`Posts sorted by ${newSortType}`)
    // Clear announcement after screen reader reads it
    setTimeout(() => setSortChangeAnnouncement(''), 1000)
  }

  const handleTimeWindowChange = (newTimeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => {
    setTimeWindow(newTimeWindow)
    setSortChangeAnnouncement(`Time window changed to ${newTimeWindow}`)
    setTimeout(() => setSortChangeAnnouncement(''), 1000)
  }

  if (loading) {
    return (
      <div className="post-list">
        <div className="post-list__header">
          <h2 className="post-list__title">Loading posts...</h2>
        </div>
        <div className="post-list__loading">
          <div className="post-list__spinner" aria-label="Loading posts"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="post-list">
        <div className="post-list__header">
          <h2 className="post-list__title">Error</h2>
        </div>
        <div className="post-list__error" role="alert">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="post-list__retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="post-list">
        <div className="post-list__header">
          <h2 className="post-list__title">Posts (0)</h2>
          <div className="post-list__controls">
            <label htmlFor="sort-select" className="post-list__sort-label">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortType}
              onChange={(e) => handleSortChange(e.target.value as PostSortType)}
              className="post-list__sort-select"
              aria-label="Sort posts by"
              disabled={loading}
            >
              <option value="new">New</option>
              <option value="hot">Hot</option>
              <option value="top">Top</option>
            </select>
            
            {sortType === 'top' && (
              <>
                <label htmlFor="time-window-select" className="post-list__time-label">
                  Time:
                </label>
                <select
                  id="time-window-select"
                  value={timeWindow}
                  onChange={(e) => handleTimeWindowChange(e.target.value as any)}
                  className="post-list__time-select"
                  aria-label="Time window for top posts"
                  disabled={loading}
                >
                  <option value="hour">Past Hour</option>
                  <option value="day">Past Day</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                  <option value="all">All Time</option>
                </select>
              </>
            )}
          </div>
        </div>
        <div className="post-list__empty">
          <h3 className="post-list__empty-title">No posts yet</h3>
          <p className="post-list__empty-description">
            Be the first to start a discussion in this channel!
          </p>
          {showCreateLink && (
            <Link 
              to="/create-post" 
              className="post-list__create-link"
            >
              Create first post
            </Link>
          )}
        </div>
        {sortChangeAnnouncement && (
          <div 
            role="status" 
            aria-live="polite" 
            className="post-list__announcement"
          >
            {sortChangeAnnouncement}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="post-list">
      <div className="post-list__header">
        <h2 className="post-list__title">Posts ({posts.length})</h2>
        <div className="post-list__controls">
          <label htmlFor="sort-select" className="post-list__sort-label">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortType}
            onChange={(e) => handleSortChange(e.target.value as PostSortType)}
            className="post-list__sort-select"
            aria-label="Sort posts by"
            disabled={loading}
          >
            <option value="new">New</option>
            <option value="hot">Hot</option>
            <option value="top">Top</option>
          </select>
          
          {sortType === 'top' && (
            <>
              <label htmlFor="time-window-select" className="post-list__time-label">
                Time:
              </label>
              <select
                id="time-window-select"
                value={timeWindow}
                onChange={(e) => handleTimeWindowChange(e.target.value as any)}
                className="post-list__time-select"
                aria-label="Time window for top posts"
                disabled={loading}
              >
                <option value="hour">Past Hour</option>
                <option value="day">Past Day</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="all">All Time</option>
              </select>
            </>
          )}
        </div>
      </div>
      
      <ul className="post-list__items" role="list">
        {posts.map((post) => (
          <li key={post.id} className="post-list__item">
            <Post post={post} compact={compact} />
          </li>
        ))}
      </ul>
      
      {sortChangeAnnouncement && (
        <div 
          role="status" 
          aria-live="polite" 
          className="post-list__announcement"
        >
          {sortChangeAnnouncement}
        </div>
      )}
    </div>
  )
}

export default PostList