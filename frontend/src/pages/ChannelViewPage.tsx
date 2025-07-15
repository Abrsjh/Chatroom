import { useParams, Link } from 'react-router-dom'
import { useChannelStore } from '../stores'
import { PostList } from '../components'
import './ChannelViewPage.css'

function ChannelViewPage() {
  const { id } = useParams<{ id: string }>()
  const { getChannelById } = useChannelStore()
  
  const channel = id ? getChannelById(id) : null

  if (!id) {
    return (
      <div className="channel-view-page">
        <h2>Channel Not Found</h2>
        <p>No channel ID provided.</p>
        <Link to="/channels">← Back to Channels</Link>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="channel-view-page">
        <h2>Channel Not Found</h2>
        <p>Channel with ID "{id}" does not exist.</p>
        <Link to="/channels">← Back to Channels</Link>
      </div>
    )
  }

  return (
    <div className="channel-view-page">
      <div className="channel-header">
        <div className="channel-header__main">
          <h1 className="channel-header__title">#{channel.name}</h1>
          <p className="channel-header__description">{channel.description}</p>
        </div>
        <div className="channel-header__actions">
          <Link 
            to="/create-post" 
            className="btn btn--primary"
          >
            Create Post
          </Link>
        </div>
      </div>
      
      <PostList channelId={id} showCreateLink />
    </div>
  )
}

export default ChannelViewPage