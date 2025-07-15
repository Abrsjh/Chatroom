import { act, renderHook, waitFor } from '@testing-library/react'
import { useChannelStore } from './channelStore'
import { Channel } from '../types'
import * as api from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockApi = api as jest.Mocked<typeof api>

const mockChannel: Channel = {
  id: '1',
  name: 'general',
  description: 'General discussion',
  created_by: 'user1',
  created_at: new Date('2024-01-01')
}

const mockChannels: Channel[] = [
  mockChannel,
  {
    id: '2',
    name: 'random',
    description: 'Random chat',
    created_by: 'user2',
    created_at: new Date('2024-01-02')
  }
]

describe('Channel Store - API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { result } = renderHook(() => useChannelStore())
    act(() => {
      result.current.clearChannels()
    })
  })

  describe('Loading States', () => {
    test('initial state includes loading and error states', () => {
      const { result } = renderHook(() => useChannelStore())
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('setLoading updates loading state', () => {
      const { result } = renderHook(() => useChannelStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })

    test('setError updates error state', () => {
      const { result } = renderHook(() => useChannelStore())
      const errorMessage = 'Failed to fetch channels'
      
      act(() => {
        result.current.setError(errorMessage)
      })
      
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('fetchChannels API Integration', () => {
    test('fetchChannels calls API and updates store on success', async () => {
      mockApi.getChannels.mockResolvedValueOnce(mockChannels)
      
      const { result } = renderHook(() => useChannelStore())
      
      await act(async () => {
        await result.current.fetchChannels()
      })
      
      expect(mockApi.getChannels).toHaveBeenCalledTimes(1)
      expect(result.current.channels).toEqual(mockChannels)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('fetchChannels sets loading state during API call', async () => {
      let resolvePromise: (value: Channel[]) => void
      const apiPromise = new Promise<Channel[]>((resolve) => {
        resolvePromise = resolve
      })
      mockApi.getChannels.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => useChannelStore())
      
      // Start the fetch
      act(() => {
        result.current.fetchChannels()
      })
      
      // Should be loading
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockChannels)
        await apiPromise
      })
      
      // Should no longer be loading
      expect(result.current.loading).toBe(false)
      expect(result.current.channels).toEqual(mockChannels)
    })

    test('fetchChannels handles API errors', async () => {
      const errorMessage = 'Failed to fetch channels: Network error'
      mockApi.getChannels.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => useChannelStore())
      
      await act(async () => {
        await result.current.fetchChannels()
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.channels).toEqual([])
    })

    test('fetchChannels clears previous error on new request', async () => {
      const { result } = renderHook(() => useChannelStore())
      
      // Set initial error
      act(() => {
        result.current.setError('Previous error')
      })
      
      mockApi.getChannels.mockResolvedValueOnce(mockChannels)
      
      await act(async () => {
        await result.current.fetchChannels()
      })
      
      expect(result.current.error).toBeNull()
      expect(result.current.channels).toEqual(mockChannels)
    })
  })

  describe('createChannel API Integration', () => {
    test('createChannel calls API and adds channel to store', async () => {
      const channelData = { name: 'new-channel', description: 'A new channel' }
      const createdChannel: Channel = {
        id: '3',
        name: 'new-channel',
        description: 'A new channel',
        created_by: 'user1',
        created_at: new Date()
      }
      
      mockApi.createChannel.mockResolvedValueOnce(createdChannel)
      
      const { result } = renderHook(() => useChannelStore())
      
      await act(async () => {
        await result.current.createChannel(channelData)
      })
      
      expect(mockApi.createChannel).toHaveBeenCalledWith(channelData)
      expect(result.current.channels).toContainEqual(createdChannel)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('createChannel handles API errors', async () => {
      const channelData = { name: '', description: 'Invalid channel' }
      const errorMessage = 'Failed to create channel: Validation error'
      
      mockApi.createChannel.mockRejectedValueOnce(new Error(errorMessage))
      
      const { result } = renderHook(() => useChannelStore())
      
      await act(async () => {
        await result.current.createChannel(channelData)
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
      expect(result.current.channels).toEqual([])
    })

    test('createChannel sets loading state during API call', async () => {
      const channelData = { name: 'test', description: 'Test channel' }
      let resolvePromise: (value: Channel) => void
      const apiPromise = new Promise<Channel>((resolve) => {
        resolvePromise = resolve
      })
      mockApi.createChannel.mockReturnValueOnce(apiPromise)
      
      const { result } = renderHook(() => useChannelStore())
      
      // Start the creation
      act(() => {
        result.current.createChannel(channelData)
      })
      
      // Should be loading
      expect(result.current.loading).toBe(true)
      
      // Resolve the promise
      const createdChannel = { ...mockChannel, id: '3', name: 'test' }
      await act(async () => {
        resolvePromise!(createdChannel)
        await apiPromise
      })
      
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Legacy Store Methods', () => {
    test('existing store methods still work', () => {
      const { result } = renderHook(() => useChannelStore())
      
      act(() => {
        result.current.addChannel(mockChannel)
        result.current.setCurrentChannel(mockChannel)
      })
      
      expect(result.current.channels).toContainEqual(mockChannel)
      expect(result.current.currentChannel).toEqual(mockChannel)
      
      act(() => {
        result.current.clearChannels()
      })
      
      expect(result.current.channels).toEqual([])
      expect(result.current.currentChannel).toBeNull()
    })
  })
})