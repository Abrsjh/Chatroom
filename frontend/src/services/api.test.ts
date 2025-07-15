import * as api from './api'
import { Channel, Post } from '../types'

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('API Service', () => {
  const API_BASE_URL = 'http://localhost:8000/api'

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Channel API', () => {
    describe('getChannels', () => {
      it('should fetch channels successfully', async () => {
        const mockChannels: Channel[] = [
          {
            id: '1',
            name: 'general',
            description: 'General discussion',
            created_by: 'user1',
            created_at: new Date('2023-01-01')
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockChannels
        } as Response)

        const result = await api.getChannels()

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        expect(result).toEqual(mockChannels)
      })

      it('should handle fetch error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        await expect(api.getChannels()).rejects.toThrow('Failed to fetch channels: Network error')
      })

      it('should handle HTTP error responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)

        await expect(api.getChannels()).rejects.toThrow('Failed to fetch channels: 500 - Internal Server Error')
      })
    })

    describe('createChannel', () => {
      it('should create channel successfully', async () => {
        const channelData = {
          name: 'new-channel',
          description: 'A new channel'
        }

        const mockChannel: Channel = {
          id: '2',
          name: 'new-channel',
          description: 'A new channel',
          created_by: 'user1',
          created_at: new Date('2023-01-01')
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockChannel
        } as Response)

        const result = await api.createChannel(channelData)

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(channelData)
        })
        expect(result).toEqual(mockChannel)
      })

      it('should handle validation errors', async () => {
        const channelData = {
          name: '',
          description: 'A new channel'
        }

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          json: async () => ({
            detail: 'Validation error'
          })
        } as Response)

        await expect(api.createChannel(channelData)).rejects.toThrow('Failed to create channel: 422 - Unprocessable Entity')
      })
    })

    describe('getChannel', () => {
      it('should fetch single channel successfully', async () => {
        const mockChannel: Channel = {
          id: '1',
          name: 'general',
          description: 'General discussion',
          created_by: 'user1',
          created_at: new Date('2023-01-01')
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockChannel
        } as Response)

        const result = await api.getChannel('1')

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels/1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        expect(result).toEqual(mockChannel)
      })

      it('should handle channel not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response)

        await expect(api.getChannel('999')).rejects.toThrow('Failed to fetch channel: 404 - Not Found')
      })
    })
  })

  describe('Post API', () => {
    describe('getChannelPosts', () => {
      it('should fetch posts for channel successfully', async () => {
        const mockPosts: Post[] = [
          {
            id: '1',
            channel_id: 'channel1',
            user_id: 'user1',
            title: 'First Post',
            content: 'This is the first post',
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-01-01')
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPosts
        } as Response)

        const result = await api.getChannelPosts('channel1')

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels/channel1/posts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        expect(result).toEqual(mockPosts)
      })

      it('should handle empty posts list', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)

        const result = await api.getChannelPosts('empty-channel')
        expect(result).toEqual([])
      })
    })

    describe('createPost', () => {
      it('should create post successfully', async () => {
        const postData = {
          title: 'New Post',
          content: 'This is a new post'
        }

        const mockPost: Post = {
          id: '2',
          channel_id: 'channel1',
          user_id: 'user1',
          title: 'New Post',
          content: 'This is a new post',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPost
        } as Response)

        const result = await api.createPost('channel1', postData)

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels/channel1/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData)
        })
        expect(result).toEqual(mockPost)
      })

      it('should handle post creation errors', async () => {
        const postData = {
          title: '',
          content: 'This is a new post'
        }

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity'
        } as Response)

        await expect(api.createPost('channel1', postData)).rejects.toThrow('Failed to create post: 422 - Unprocessable Entity')
      })
    })

    describe('getPost', () => {
      it('should fetch single post successfully', async () => {
        const mockPost: Post = {
          id: '1',
          channel_id: 'channel1',
          user_id: 'user1',
          title: 'First Post',
          content: 'This is the first post',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPost
        } as Response)

        const result = await api.getPost('1')

        expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/posts/1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        expect(result).toEqual(mockPost)
      })

      it('should handle post not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response)

        await expect(api.getPost('999')).rejects.toThrow('Failed to fetch post: 404 - Not Found')
      })
    })
  })

  describe('Error handling', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(api.getChannels()).rejects.toThrow('Failed to fetch channels: Request timeout')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Failed to fetch channels: Invalid JSON')
    })
  })
})