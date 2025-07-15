import { act, renderHook } from '@testing-library/react'
import { useChannelStore } from './channelStore'
import { Channel } from '../types'

const mockChannel: Channel = {
  id: '1',
  name: 'general',
  description: 'General discussion',
  created_by: 'user1',
  created_at: new Date('2024-01-01')
}

const mockChannel2: Channel = {
  id: '2',
  name: 'random',
  description: 'Random chat',
  created_by: 'user2',
  created_at: new Date('2024-01-02')
}

describe('Channel Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useChannelStore())
    act(() => {
      result.current.clearChannels()
    })
  })

  test('initial state has empty channels array and no current channel', () => {
    const { result } = renderHook(() => useChannelStore())
    
    expect(result.current.channels).toEqual([])
    expect(result.current.currentChannel).toBeNull()
  })

  test('addChannel adds a channel to the store', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.addChannel(mockChannel)
    })
    
    expect(result.current.channels).toHaveLength(1)
    expect(result.current.channels[0]).toEqual(mockChannel)
  })

  test('addChannel adds multiple channels', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.addChannel(mockChannel)
      result.current.addChannel(mockChannel2)
    })
    
    expect(result.current.channels).toHaveLength(2)
    expect(result.current.channels).toContainEqual(mockChannel)
    expect(result.current.channels).toContainEqual(mockChannel2)
  })

  test('setCurrentChannel updates current channel', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.setCurrentChannel(mockChannel)
    })
    
    expect(result.current.currentChannel).toEqual(mockChannel)
  })

  test('setCurrentChannel can clear current channel with null', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.setCurrentChannel(mockChannel)
      result.current.setCurrentChannel(null)
    })
    
    expect(result.current.currentChannel).toBeNull()
  })

  test('setChannels replaces entire channels array', () => {
    const { result } = renderHook(() => useChannelStore())
    const channels = [mockChannel, mockChannel2]
    
    act(() => {
      result.current.setChannels(channels)
    })
    
    expect(result.current.channels).toEqual(channels)
    expect(result.current.channels).toHaveLength(2)
  })

  test('clearChannels empties the channels array', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.addChannel(mockChannel)
      result.current.addChannel(mockChannel2)
      result.current.clearChannels()
    })
    
    expect(result.current.channels).toEqual([])
    expect(result.current.channels).toHaveLength(0)
  })

  test('getChannelById returns correct channel', () => {
    const { result } = renderHook(() => useChannelStore())
    
    act(() => {
      result.current.addChannel(mockChannel)
      result.current.addChannel(mockChannel2)
    })
    
    const foundChannel = result.current.getChannelById('1')
    expect(foundChannel).toEqual(mockChannel)
    
    const notFoundChannel = result.current.getChannelById('999')
    expect(notFoundChannel).toBeUndefined()
  })
})