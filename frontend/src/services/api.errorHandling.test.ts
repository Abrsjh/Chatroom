import * as api from './api'
import { Channel, Post } from '../types'

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('API Service - Enhanced Error Handling', () => {
  const API_BASE_URL = 'http://localhost:8000/api'

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('HTTP Status Code Handling', () => {
    test('handles 400 Bad Request with specific error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'Invalid channel name format',
          details: { name: 'Channel name must contain only letters, numbers, and hyphens' }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Invalid channel name format')
    })

    test('handles 401 Unauthorized with authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'Authentication required',
          details: { reason: 'Token expired' }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Authentication required. Please log in again.')
    })

    test('handles 403 Forbidden with permission error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: 'Insufficient permissions',
          details: { required: 'channel:read' }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('You do not have permission to access this resource.')
    })

    test('handles 404 Not Found with resource-specific error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: 'Channel not found',
          details: { channelId: 'non-existent-id' }
        })
      } as Response)

      await expect(api.getChannel('non-existent-id')).rejects.toThrow('The requested channel was not found.')
    })

    test('handles 422 Validation Error with field-specific details', async () => {
      const channelData = { name: '', description: 'Test' }
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          error: 'Validation failed',
          details: {
            name: ['This field is required', 'Minimum length is 3 characters'],
            description: ['Maximum length is 500 characters']
          }
        })
      } as Response)

      await expect(api.createChannel(channelData)).rejects.toThrow('Validation failed: name is required and must be at least 3 characters.')
    })

    test('handles 429 Rate Limit with retry information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '60'
        }),
        json: async () => ({
          error: 'Rate limit exceeded',
          details: { retryAfter: 60, limit: 100, window: 3600 }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Rate limit exceeded. Please try again in 1 minute.')
    })

    test('handles 500 Internal Server Error with user-friendly message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          error: 'Internal server error',
          details: { code: 'DATABASE_CONNECTION_FAILED' }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Something went wrong on our end. Please try again later.')
    })

    test('handles 502 Bad Gateway with service unavailable message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => ({})
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Service temporarily unavailable. Please try again.')
    })

    test('handles 503 Service Unavailable with maintenance message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Retry-After': '300'
        }),
        json: async () => ({
          error: 'Service under maintenance',
          details: { estimatedDuration: 300 }
        })
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Service is temporarily under maintenance. Please try again in 5 minutes.')
    })
  })

  describe('Network Error Handling', () => {
    test('handles network timeout with retry suggestion', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(api.getChannels()).rejects.toThrow('Request timed out. Please check your connection and try again.')
    })

    test('handles network connectivity issues', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'))

      await expect(api.getChannels()).rejects.toThrow('Unable to connect to the server. Please check your internet connection.')
    })

    test('handles DNS resolution errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      await expect(api.getChannels()).rejects.toThrow('Unable to reach the server. Please try again later.')
    })

    test('handles CORS errors with helpful message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CORS policy: No \'Access-Control-Allow-Origin\' header'))

      await expect(api.getChannels()).rejects.toThrow('Unable to access the service due to security restrictions.')
    })
  })

  describe('Malformed Response Handling', () => {
    test('handles invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON')
        }
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('Received invalid response from server. Please try again.')
    })

    test('handles empty response when data expected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      } as Response)

      await expect(api.getChannels()).rejects.toThrow('No data received from server.')
    })

    test('handles response with missing required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'test' } // missing required fields
        ]
      } as Response)

      try {
        await api.getChannels()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid data format received')
      }
    })
  })

  describe('Retry Logic and Recovery', () => {
    test('automatically retries on 503 Service Unavailable', async () => {
      // First two calls fail with 503
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)

      const result = await api.getChannelsWithRetry()
      
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })

    test('automatically retries on network timeout', async () => {
      // First call times out, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)

      const result = await api.getChannelsWithRetry()
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    test('gives up after maximum retry attempts', async () => {
      // All calls fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getChannelsWithRetry()).rejects.toThrow('Service is currently unavailable after multiple attempts. Please try again later.')
      
      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    test('uses exponential backoff for retries', async () => {
      const startTime = Date.now()
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)

      await api.getChannelsWithRetry()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should have waited at least for the exponential backoff delays
      expect(duration).toBeGreaterThan(1000) // 1s + 2s minimum
    })
  })

  describe('Request Context and Metadata', () => {
    test('includes request ID in error messages for tracking', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({
          'X-Request-ID': 'req-12345'
        }),
        json: async () => ({
          error: 'Internal server error'
        })
      } as Response)

      try {
        await api.getChannels()
      } catch (error) {
        expect((error as Error).message).toContain('Request ID: req-12345')
      }
    })

    test('preserves user-friendly error context across operations', async () => {
      const channelData = { name: 'test', description: 'test channel' }
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: 'Channel already exists',
          details: { name: 'test' }
        })
      } as Response)

      await expect(api.createChannel(channelData)).rejects.toThrow('A channel with the name "test" already exists.')
    })
  })

  describe('Error Recovery Suggestions', () => {
    test('provides specific recovery steps for validation errors', async () => {
      const postData = { title: 'Hi', content: 'Short' }
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          error: 'Validation failed',
          details: {
            title: ['Minimum length is 3 characters'],
            content: ['Minimum length is 10 characters']
          }
        })
      } as Response)

      try {
        await api.createPost('channel1', postData)
      } catch (error) {
        expect((error as Error).message).toContain('Please fix the following issues:')
        expect((error as Error).message).toContain('• Title: Minimum length is 3 characters')
        expect((error as Error).message).toContain('• Content: Minimum length is 10 characters')
      }
    })

    test('suggests refresh for stale data errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: 'Data has been modified',
          details: { lastModified: '2024-01-01T12:00:00Z' }
        })
      } as Response)

      await expect(api.createPost('channel1', { title: 'test', content: 'test content' }))
        .rejects.toThrow('The data has been updated by another user. Please refresh and try again.')
    })
  })
})