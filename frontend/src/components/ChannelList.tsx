import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useChannelStore } from '../stores'
import { Channel } from '../types'
import './ChannelList.css'

function ChannelList() {
  const { 
    channels, 
    currentChannel, 
    loading,
    error,
    setCurrentChannel, 
    fetchChannels,
    setError
  } = useChannelStore()

  // Fetch channels on component mount
  useEffect(() => {
    if (channels.length === 0 && !loading && !error) {
      fetchChannels()
    }
  }, [channels.length, loading, error, fetchChannels])

  const handleChannelClick = (channel: Channel) => {
    setCurrentChannel(channel)
  }

  const handleRetry = () => {
    setError(null)
    fetchChannels()
  }

  // Loading state
  if (loading) {
    return (
      <div className="channel-list">
        <h2 className="channel-list__title">Channels</h2>
        <div className="channel-list__loading" data-testid="channel-list-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading channels...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="channel-list">
        <h2 className="channel-list__title">Channels</h2>
        <div className="channel-list__error" data-testid="channel-list-error">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={handleRetry}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (channels.length === 0) {
    return (
      <div className="channel-list">
        <h2 className="channel-list__title">Channels</h2>
        <div className="channel-list__empty">
          <p className="channel-list__empty-title">No channels available</p>
          <p className="channel-list__empty-description">
            Channels will appear here once they are created.
          </p>
        </div>
      </div>
    )
  }

  // Success state with channels
  return (
    <div className="channel-list">
      <h2 className="channel-list__title">Channels</h2>
      <ul className="channel-list__items" role="list">
        {channels.map((channel) => (
          <li 
            key={channel.id} 
            className={`channel-item ${
              currentChannel?.id === channel.id ? 'channel-item--current' : ''
            }`}
            data-testid={`channel-item-${channel.id}`}
          >
            <Link
              to={`/channels/${channel.id}`}
              className="channel-item__link"
              onClick={() => handleChannelClick(channel)}
            >
              <div className="channel-item__content">
                <h3 className="channel-item__name">#{channel.name}</h3>
                <p className="channel-item__description">{channel.description}</p>
                <span className="channel-item__meta">
                  {Math.floor(Math.random() * 100) + 1} members
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ChannelList