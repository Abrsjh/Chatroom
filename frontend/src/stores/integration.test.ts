import { act, renderHook } from '@testing-library/react'
import { useChannelStore, usePostStore } from './index'
import { Channel, Post } from '../types'

const mockChannel: Channel = {
  id: 'channel1',
  name: 'general',
  description: 'General discussion',
  created_by: 'user1',
  created_at: new Date('2024-01-01')
}

const mockPost: Post = {
  id: 'post1',
  channel_id: 'channel1',
  user_id: 'user1',
  title: 'Test Post',
  content: 'This is a test post',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

describe('Store Integration', () => {
  beforeEach(() => {
    const { result: channelResult } = renderHook(() => useChannelStore())
    const { result: postResult } = renderHook(() => usePostStore())
    
    act(() => {
      channelResult.current.clearChannels()
      postResult.current.clearPosts()
    })
  })

  test('stores can be used together for channel-post relationship', () => {
    const { result: channelResult } = renderHook(() => useChannelStore())
    const { result: postResult } = renderHook(() => usePostStore())
    
    // Add channel
    act(() => {
      channelResult.current.addChannel(mockChannel)
      channelResult.current.setCurrentChannel(mockChannel)
    })
    
    // Add post to that channel
    act(() => {
      postResult.current.addPost(mockPost)
    })
    
    // Verify relationship
    expect(channelResult.current.currentChannel?.id).toBe('channel1')
    
    const channelPosts = postResult.current.getPostsByChannelId('channel1')
    expect(channelPosts).toHaveLength(1)
    expect(channelPosts[0]).toEqual(mockPost)
  })

  test('stores maintain independent state', () => {
    const { result: channelResult } = renderHook(() => useChannelStore())
    const { result: postResult } = renderHook(() => usePostStore())
    
    act(() => {
      channelResult.current.addChannel(mockChannel)
      postResult.current.addPost(mockPost)
    })
    
    // Clear one store shouldn't affect the other
    act(() => {
      channelResult.current.clearChannels()
    })
    
    expect(channelResult.current.channels).toHaveLength(0)
    expect(postResult.current.posts).toHaveLength(1)
  })
})