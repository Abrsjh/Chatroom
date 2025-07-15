import { useParams, Link } from 'react-router-dom'
import { usePostStore } from '../stores'
import { Post } from '../components'

function PostViewPage() {
  const { id } = useParams<{ id: string }>()
  const { getPostById } = usePostStore()
  
  const post = id ? getPostById(id) : null

  if (!id) {
    return (
      <div className="post-view-page">
        <h2>Post Not Found</h2>
        <p>No post ID provided.</p>
        <Link to="/channels">← Back to Channels</Link>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="post-view-page">
        <h2>Post Not Found</h2>
        <p>Post with ID "{id}" does not exist.</p>
        <Link to="/channels">← Back to Channels</Link>
      </div>
    )
  }

  return (
    <div className="post-view-page">
      <div className="post-view-header">
        <Link to={`/channels/${post.channel_id}`}>
          ← Back to Channel
        </Link>
      </div>
      
      <div className="post-view-content">
        <Post post={post} />
        
        <div className="post-view-full-content">
          <div className="post-full-content">
            <h1>{post.title}</h1>
            <div className="post-content">
              {post.content.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
        
        <div className="post-view-placeholder">
          <p>Comments and replies will be implemented in the next phase.</p>
        </div>
      </div>
    </div>
  )
}

export default PostViewPage